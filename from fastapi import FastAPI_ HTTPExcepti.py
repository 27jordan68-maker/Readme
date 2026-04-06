from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
import jwt
from datetime import datetime, timedelta
import bcrypt  # для сравнения хеша пароля
from sqlalchemy.orm import Session
from your_database_models import User  # ваша модель пользователя

app = FastAPI()

# Конфигурация JWT
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Модели запроса и ответа
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    is_blocked: bool

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Вспомогательная функция для создания JWT
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Эндпоинт логина
@app.post("/adi/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    # 1. Проверить существование пользователя по email
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # 2. Сравнить пароль с хешем в БД (предполагаем, что в БД хранится bcrypt хеш)
    if not bcrypt.checkpw(request.password.encode('utf-8'), user.password_hash.encode('utf-8')):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # 3. Если пользователь заблокирован (is_blocked = true) — вернуть ошибку
    if user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is blocked"
        )
    
    # 4. Вернуть JWT токен и данные пользователя
    access_token = create_access_token(data={"sub": user.email, "user_id": user.id})
    
    return LoginResponse(
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            is_blocked=user.is_blocked
        )
    )