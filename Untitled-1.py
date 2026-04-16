from sqlalchemy import Column, Integer, String, DateTime, func
from database import Base

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    email = Column(String(100), nullable=False)
    subject = Column(String(100), nullable=False)
    message = Column(String(2000), nullable=False)
    status = Column(String(20), default="new")
    created_at = Column(DateTime, server_default=func.now())
    from pydantic import BaseModel, EmailStr, Field

class FeedbackCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr  # автоматическая проверка формата email
    subject: str = Field(..., min_length=3, max_length=100)
    message: str = Field(..., min_length=10, max_length=2000)
    from fastapi import FastAPI, HTTPException, status
from sqlalchemy.orm import Session

app = FastAPI()

@app.post("/api/feedback", status_code=status.HTTP_200_OK)
async def create_feedback(feedback: FeedbackCreate, db: Session = Depends(get_db)):
    # Сохраняем в таблицу
    db_feedback = Feedback(
        name=feedback.name,
        email=feedback.email,
        subject=feedback.subject,
        message=feedback.message,
        status="new"
    )
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)

    # Возвращаем подтверждение
    return {"message": "Feedback sent successfully", "id": db_feedback.id}
{
  "message": "Feedback sent successfully",
  "id": 42
}