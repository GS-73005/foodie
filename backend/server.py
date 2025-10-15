from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'foodies_circle')]

# Security setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

# Fernet encryption setup
FERNET_KEY = os.environ.get('FERNET_KEY', Fernet.generate_key().decode())
fernet = Fernet(FERNET_KEY.encode() if isinstance(FERNET_KEY, str) else FERNET_KEY)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_token(user_id: str, user_type: str) -> str:
    payload = {
        "user_id": user_id,
        "user_type": user_type,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> Dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    return payload

def encrypt_promo_code(promo_text: str, promoter_id: str, restaurant_id: str, post_id: str, dish_id: str = "") -> str:
    data = f"{promo_text}|{promoter_id}|{restaurant_id}|{post_id}|{dish_id}"
    encrypted = fernet.encrypt(data.encode())
    return base64.urlsafe_b64encode(encrypted).decode()

def decrypt_promo_code(encrypted_code: str) -> Dict:
    try:
        decoded = base64.urlsafe_b64decode(encrypted_code.encode())
        decrypted = fernet.decrypt(decoded).decode()
        parts = decrypted.split("|")
        return {
            "promo_text": parts[0],
            "promoter_id": parts[1],
            "restaurant_id": parts[2],
            "post_id": parts[3],
            "dish_id": parts[4] if len(parts) > 4 else ""
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid promo code")

# Pydantic Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    profile_name: str
    handle: str
    user_type: str  # 'Foodie' or 'Restaurant'
    avatar_base64: Optional[str] = None
    bio: Optional[str] = None
    restaurant_details: Optional[Dict] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    profile_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_base64: Optional[str] = None
    restaurant_details: Optional[Dict] = None

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None
    place_name: Optional[str] = None

class PostCreate(BaseModel):
    image_base64: str
    caption: str
    stars: Optional[int] = None
    restaurant_tagged_id: Optional[str] = None
    location: Optional[Dict] = None
    is_promotion_request: bool = False
    promotion_offer_idea: Optional[str] = None

class CommentCreate(BaseModel):
    text: str

class PromoApprove(BaseModel):
    promo_code_plain_text: str
    offer_description: str
    expiry_date: Optional[str] = None

class PromoRedeem(BaseModel):
    promo_code_encrypted: str
    redeemer_user_id: str

# Auth Endpoints
@api_router.post("/register")
async def register(user: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"$or": [{"email": user.email}, {"handle": user.handle}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email or handle already exists")
    
    # Create user
    user_dict = user.dict()
    user_dict["password_hash"] = hash_password(user.password)
    del user_dict["password"]
    user_dict["followers"] = []
    user_dict["following"] = []
    user_dict["created_at"] = datetime.utcnow()
    
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    token = create_token(user_id, user.user_type)
    
    return {
        "token": token,
        "user_id": user_id,
        "user_type": user.user_type,
        "profile_name": user.profile_name,
        "handle": user.handle
    }

@api_router.post("/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(user["_id"])
    token = create_token(user_id, user["user_type"])
    
    return {
        "token": token,
        "user_id": user_id,
        "user_type": user["user_type"],
        "profile_name": user["profile_name"],
        "handle": user["handle"],
        "avatar_base64": user.get("avatar_base64")
    }

@api_router.get("/me")
async def get_me(current_user: Dict = Depends(get_current_user)):
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user["_id"] = str(user["_id"])
    user.pop("password_hash", None)
    return user

# User Endpoints
@api_router.get("/users/search")
async def search_users(q: str, filter_type: Optional[str] = None):
    query = {"$or": [
        {"profile_name": {"$regex": q, "$options": "i"}},
        {"handle": {"$regex": q, "$options": "i"}}
    ]}
    
    if filter_type:
        query["user_type"] = filter_type
    
    users = await db.users.find(query).limit(20).to_list(20)
    
    for user in users:
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
    
    return users

@api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user["_id"] = str(user["_id"])
    user.pop("password_hash", None)
    
    # Get post count
    post_count = await db.posts.count_documents({"user_id": user_id})
    user["post_count"] = post_count
    
    return user

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, update: UserUpdate, current_user: Dict = Depends(get_current_user)):
    if current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_dict = {k: v for k, v in update.dict().items() if v is not None}
    if update_dict:
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_dict})
    
    return {"message": "User updated successfully"}

@api_router.put("/users/{user_id}/location")
async def update_location(user_id: str, location: LocationUpdate, current_user: Dict = Depends(get_current_user)):
    if current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("user_type") != "Restaurant":
        raise HTTPException(status_code=400, detail="Only restaurants can set locations")
    
    # Update restaurant_details with location
    restaurant_details = user.get("restaurant_details", {})
    restaurant_details["location"] = {
        "latitude": location.latitude,
        "longitude": location.longitude,
        "address": location.address,
        "place_name": location.place_name
    }
    
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"restaurant_details": restaurant_details}}
    )
    
    return {"message": "Location updated successfully", "location": restaurant_details["location"]}


@api_router.post("/users/{user_id}/follow")
async def follow_user(user_id: str, current_user: Dict = Depends(get_current_user)):
    follower_id = current_user["user_id"]
    
    # Add to following list
    await db.users.update_one(
        {"_id": ObjectId(follower_id)},
        {"$addToSet": {"following": user_id}}
    )
    
    # Add to followers list
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$addToSet": {"followers": follower_id}}
    )
    
    return {"message": "Followed successfully"}

@api_router.post("/users/{user_id}/unfollow")
async def unfollow_user(user_id: str, current_user: Dict = Depends(get_current_user)):
    follower_id = current_user["user_id"]
    
    # Remove from following list
    await db.users.update_one(
        {"_id": ObjectId(follower_id)},
        {"$pull": {"following": user_id}}
    )
    
    # Remove from followers list
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$pull": {"followers": follower_id}}
    )
    
    return {"message": "Unfollowed successfully"}

# Post Endpoints
@api_router.post("/posts")
async def create_post(post: PostCreate, current_user: Dict = Depends(get_current_user)):
    post_dict = post.dict()
    post_dict["user_id"] = current_user["user_id"]
    post_dict["post_type"] = "Promotion" if post.is_promotion_request else "Normal"
    post_dict["likes"] = []
    post_dict["comments"] = []
    post_dict["promotion_status"] = "Pending" if post.is_promotion_request else "N/A"
    post_dict["created_at"] = datetime.utcnow()
    post_dict["updated_at"] = datetime.utcnow()
    
    result = await db.posts.insert_one(post_dict)
    post_id = str(result.inserted_id)
    
    return {"post_id": post_id, "message": "Post created successfully"}

@api_router.get("/posts/feed/trending")
async def get_trending_feed(city: Optional[str] = None, skip: int = 0, limit: int = 20):
    query = {"promotion_status": {"$in": ["N/A", "Approved"]}}
    
    if city:
        query["location.name"] = {"$regex": city, "$options": "i"}
    
    posts = await db.posts.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich posts with user data
    for post in posts:
        post["_id"] = str(post["_id"])
        user = await db.users.find_one({"_id": ObjectId(post["user_id"])})
        if user:
            post["user"] = {
                "_id": str(user["_id"]),
                "profile_name": user["profile_name"],
                "handle": user["handle"],
                "avatar_base64": user.get("avatar_base64"),
                "user_type": user["user_type"]
            }
        
        # Get promo code if approved
        if post.get("promo_code_id"):
            promo = await db.promocodes.find_one({"_id": ObjectId(post["promo_code_id"])})
            if promo:
                post["promo_code"] = promo["code_encrypted"]
                post["offer_description"] = promo["offer_description"]
    
    return posts

@api_router.get("/posts/feed/following")
async def get_following_feed(skip: int = 0, limit: int = 20, current_user: Dict = Depends(get_current_user)):
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    following = user.get("following", [])
    
    posts = await db.posts.find(
        {"user_id": {"$in": following}, "promotion_status": {"$in": ["N/A", "Approved"]}}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich posts with user data
    for post in posts:
        post["_id"] = str(post["_id"])
        user = await db.users.find_one({"_id": ObjectId(post["user_id"])})
        if user:
            post["user"] = {
                "_id": str(user["_id"]),
                "profile_name": user["profile_name"],
                "handle": user["handle"],
                "avatar_base64": user.get("avatar_base64"),
                "user_type": user["user_type"]
            }
    
    return posts

@api_router.get("/posts/{post_id}")
async def get_post(post_id: str):
    post = await db.posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post["_id"] = str(post["_id"])
    
    # Get user data
    user = await db.users.find_one({"_id": ObjectId(post["user_id"])})
    if user:
        post["user"] = {
            "_id": str(user["_id"]),
            "profile_name": user["profile_name"],
            "handle": user["handle"],
            "avatar_base64": user.get("avatar_base64"),
            "user_type": user["user_type"]
        }
    
    return post

@api_router.post("/posts/{post_id}/like")
async def like_post(post_id: str, current_user: Dict = Depends(get_current_user)):
    await db.posts.update_one(
        {"_id": ObjectId(post_id)},
        {"$addToSet": {"likes": current_user["user_id"]}}
    )
    return {"message": "Post liked"}

@api_router.post("/posts/{post_id}/unlike")
async def unlike_post(post_id: str, current_user: Dict = Depends(get_current_user)):
    await db.posts.update_one(
        {"_id": ObjectId(post_id)},
        {"$pull": {"likes": current_user["user_id"]}}
    )
    return {"message": "Post unliked"}

@api_router.post("/posts/{post_id}/comments")
async def add_comment(post_id: str, comment: CommentCreate, current_user: Dict = Depends(get_current_user)):
    comment_obj = {
        "user_id": current_user["user_id"],
        "text": comment.text,
        "created_at": datetime.utcnow()
    }
    
    await db.posts.update_one(
        {"_id": ObjectId(post_id)},
        {"$push": {"comments": comment_obj}}
    )
    
    return {"message": "Comment added"}

@api_router.get("/posts/{post_id}/comments")
async def get_comments(post_id: str):
    post = await db.posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comments = post.get("comments", [])
    
    # Enrich with user data
    for comment in comments:
        user = await db.users.find_one({"_id": ObjectId(comment["user_id"])})
        if user:
            comment["user"] = {
                "profile_name": user["profile_name"],
                "handle": user["handle"],
                "avatar_base64": user.get("avatar_base64")
            }
    
    return comments

@api_router.get("/users/{user_id}/posts")
async def get_user_posts(user_id: str, skip: int = 0, limit: int = 20):
    posts = await db.posts.find({"user_id": user_id}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for post in posts:
        post["_id"] = str(post["_id"])
    
    return posts

# Promotion Endpoints
@api_router.get("/restaurants/{restaurant_id}/promo_requests")
async def get_promo_requests(restaurant_id: str, current_user: Dict = Depends(get_current_user)):
    if current_user["user_id"] != restaurant_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    posts = await db.posts.find({
        "restaurant_tagged_id": restaurant_id,
        "is_promotion_request": True,
        "promotion_status": "Pending"
    }).to_list(100)
    
    # Enrich with user data
    for post in posts:
        post["_id"] = str(post["_id"])
        user = await db.users.find_one({"_id": ObjectId(post["user_id"])})
        if user:
            post["user"] = {
                "_id": str(user["_id"]),
                "profile_name": user["profile_name"],
                "handle": user["handle"],
                "avatar_base64": user.get("avatar_base64")
            }
    
    return posts

@api_router.post("/restaurants/{restaurant_id}/promo_requests/{post_id}/approve")
async def approve_promo(restaurant_id: str, post_id: str, promo: PromoApprove, current_user: Dict = Depends(get_current_user)):
    if current_user["user_id"] != restaurant_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    post = await db.posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Encrypt promo code
    encrypted_code = encrypt_promo_code(
        promo.promo_code_plain_text,
        post["user_id"],
        restaurant_id,
        post_id
    )
    
    # Create promo code entry
    promo_dict = {
        "code_encrypted": encrypted_code,
        "promoter_foodie_id": post["user_id"],
        "restaurant_id": restaurant_id,
        "post_id": post_id,
        "offer_description": promo.offer_description,
        "expiry_date": promo.expiry_date,
        "redemptions": [],
        "created_at": datetime.utcnow()
    }
    
    result = await db.promocodes.insert_one(promo_dict)
    promo_code_id = str(result.inserted_id)
    
    # Update post
    await db.posts.update_one(
        {"_id": ObjectId(post_id)},
        {"$set": {
            "promotion_status": "Approved",
            "promo_code_id": promo_code_id,
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Promo approved", "encrypted_code": encrypted_code}

@api_router.post("/restaurants/{restaurant_id}/promo_requests/{post_id}/reject")
async def reject_promo(restaurant_id: str, post_id: str, current_user: Dict = Depends(get_current_user)):
    if current_user["user_id"] != restaurant_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.posts.update_one(
        {"_id": ObjectId(post_id)},
        {"$set": {"promotion_status": "Rejected", "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Promo rejected"}

@api_router.post("/restaurants/{restaurant_id}/redeem_promo")
async def redeem_promo(restaurant_id: str, redemption: PromoRedeem, current_user: Dict = Depends(get_current_user)):
    if current_user["user_id"] != restaurant_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Decrypt code
    decrypted = decrypt_promo_code(redemption.promo_code_encrypted)
    
    # Verify restaurant
    if decrypted["restaurant_id"] != restaurant_id:
        raise HTTPException(status_code=400, detail="Invalid promo code for this restaurant")
    
    # Find promo code
    promo = await db.promocodes.find_one({"post_id": decrypted["post_id"]})
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    # Check expiry
    if promo.get("expiry_date"):
        expiry = datetime.fromisoformat(promo["expiry_date"])
        if datetime.utcnow() > expiry:
            raise HTTPException(status_code=400, detail="Promo code expired")
    
    # Add redemption
    redemption_obj = {
        "redeemer_user_id": redemption.redeemer_user_id,
        "redeemed_at": datetime.utcnow(),
        "restaurant_confirmation_status": "Confirmed"
    }
    
    await db.promocodes.update_one(
        {"_id": promo["_id"]},
        {"$push": {"redemptions": redemption_obj}}
    )
    
    # Update loyalty points
    promoter_id = decrypted["promoter_id"]
    loyalty = await db.loyalty_points.find_one({
        "restaurant_id": restaurant_id,
        "foodie_id": promoter_id
    })
    
    if loyalty:
        await db.loyalty_points.update_one(
            {"_id": loyalty["_id"]},
            {
                "$inc": {"points": 10},
                "$push": {"transactions": {
                    "amount": 10,
                    "type": "Earned",
                    "source_promo_code_id": str(promo["_id"]),
                    "date": datetime.utcnow()
                }},
                "$set": {"last_updated": datetime.utcnow()}
            }
        )
    else:
        await db.loyalty_points.insert_one({
            "restaurant_id": restaurant_id,
            "foodie_id": promoter_id,
            "points": 10,
            "transactions": [{
                "amount": 10,
                "type": "Earned",
                "source_promo_code_id": str(promo["_id"]),
                "date": datetime.utcnow()
            }],
            "last_updated": datetime.utcnow()
        })
    
    return {"message": "Promo redeemed successfully", "points_awarded": 10}

# Loyalty Points Endpoints
@api_router.get("/users/{foodie_id}/loyalty_points")
async def get_loyalty_points(foodie_id: str, current_user: Dict = Depends(get_current_user)):
    if current_user["user_id"] != foodie_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    loyalty_points = await db.loyalty_points.find({"foodie_id": foodie_id}).to_list(100)
    
    for lp in loyalty_points:
        lp["_id"] = str(lp["_id"])
        # Get restaurant info
        restaurant = await db.users.find_one({"_id": ObjectId(lp["restaurant_id"])})
        if restaurant:
            lp["restaurant"] = {
                "profile_name": restaurant["profile_name"],
                "avatar_base64": restaurant.get("avatar_base64")
            }
    
    return loyalty_points

@api_router.get("/restaurants/{restaurant_id}/loyalty_points")
async def get_restaurant_loyalty_points(restaurant_id: str, current_user: Dict = Depends(get_current_user)):
    if current_user["user_id"] != restaurant_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    loyalty_points = await db.loyalty_points.find({"restaurant_id": restaurant_id}).to_list(100)
    
    for lp in loyalty_points:
        lp["_id"] = str(lp["_id"])
        # Get foodie info
        foodie = await db.users.find_one({"_id": ObjectId(lp["foodie_id"])})
        if foodie:
            lp["foodie"] = {
                "profile_name": foodie["profile_name"],
                "handle": foodie["handle"],
                "avatar_base64": foodie.get("avatar_base64")
            }
    
    return loyalty_points

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
