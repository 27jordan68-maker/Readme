from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Отношения
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<User {self.username}>'


class UserProfile(db.Model):
    __tablename__ = 'user_profiles'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    first_name = Column(String(50))
    last_name = Column(String(50))
    phone = Column(String(20))
    date_of_birth = Column(DateTime)
    bio = Column(Text)
    avatar_url = Column(String(500))
    country = Column(String(50))
    city = Column(String(50))
    
    # Отношения
    user = relationship("User", back_populates="profile")
    
    def __repr__(self):
        return f'<UserProfile for user {self.user_id}>'


class Feedback(db.Model):
    __tablename__ = 'feedbacks'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    rating = Column(Integer)  # Оценка от 1 до 5
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Отношения
    user = relationship("User", back_populates="feedbacks")
    
    def __repr__(self):
        return f'<Feedback {self.id} by user {self.user_id}>'


class Tournament(db.Model):
    __tablename__ = 'tournaments'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    location = Column(String(200))
    max_participants = Column(Integer)
    prize_pool = Column(Float)
    rules = Column(Text)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Отношения
    creator = relationship("User", foreign_keys=[created_by])
    teams = relationship("Team", back_populates="tournament", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Tournament {self.name}>'


class Team(db.Model):
    __tablename__ = 'teams'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    logo_url = Column(String(500))
    tournament_id = Column(Integer, ForeignKey('tournaments.id', ondelete='CASCADE'), nullable=False)
    captain_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    max_members = Column(Integer, default=5)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Отношения
    tournament = relationship("Tournament", back_populates="teams")
    captain = relationship("User", foreign_keys=[captain_id])
    creator = relationship("User", foreign_keys=[created_by])
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Team {self.name}>'


class TeamMember(db.Model):
    __tablename__ = 'team_members'
    
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role = Column(String(50), default='member')  # member, co-captain, etc.
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Отношения
    team = relationship("Team", back_populates="members")
    user = relationship("User")
    
    __table_args__ = (db.UniqueConstraint('team_id', 'user_id', name='unique_team_member'),)
    
    def __repr__(self):
        return f'<TeamMember team={self.team_id} user={self.user_id}>'
        python

# В Flask приложении
with app.app_context():
    db.create_all()
    python

# Создание пользователя с профилем
user = User(username='john_doe', email='john@example.com', password_hash='hash')
profile = UserProfile(first_name='John', last_name='Doe', phone='+123456789')
user.profile = profile
db.session.add(user)
db.session.commit()

# Создание турнира с командой
tournament = Tournament(name='Summer Cup', start_date=datetime(2024, 6, 1), end_date=datetime(2024, 6, 5))
team = Team(name='Dream Team', tournament=tournament)
db.session.add_all([tournament, team])
db.session.commit()
ython

# Добавьте в классы моделей:
__table_args__ = (
    db.Index('idx_user_email', 'email'),
    db.Index('idx_tournament_dates', 'start_date', 'end_date'),
)