from app import db
import enum

class Gender(enum.Enum):
    MALE = "male"
    FEMALE = "female"
    NON_BINARY = "non_binary"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"

class Grade(enum.Enum):
    FRESHMAN = "freshman"
    SOPHOMORE = "sophomore"
    JUNIOR = "junior"
    SENIOR = "senior"
    POSTGRADUATE = "postgraduate"

class User(db.Model):
    __tablename__ = "users"
    uid = db.Column(db.String, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String, unique=True, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())


class UserProfile(db.Model):
    __tablename__ = "user_profiles"
    uid = db.Column(db.String, db.ForeignKey("users.uid"), primary_key=True)
    date_of_birth = db.Column(db.Date, nullable=False) 
    grade = db.Column(db.Enum(Grade), nullable=False)
    gender = db.Column(db.Enum(Gender), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())


class Course(db.Model):
    __tablename__ = "courses"
    course_id = db.Column(db.String, primary_key=True)
    title = db.Column(db.String, nullable=False)


class UserCourse(db.Model):
    __tablename__ = "user_courses"
    uid = db.Column(db.String, db.ForeignKey("users.uid"), primary_key=True)
    course_id = db.Column(db.String, db.ForeignKey("courses.course_id"), primary_key=True)
