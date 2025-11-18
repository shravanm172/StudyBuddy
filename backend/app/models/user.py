from app import db

class User(db.Model):
    __tablename__ = "users"
    uid = db.Column(db.String, primary_key=True)
    email = db.Column(db.String, unique=True, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

class UserProfile(db.Model):
    __tablename__ = "user_profiles"
    uid = db.Column(db.String, db.ForeignKey("users.uid"), primary_key=True)
    age = db.Column(db.Integer, nullable=False)
    grade = db.Column(db.String, nullable=False)
    school = db.Column(db.String, nullable=False)
    gender = db.Column(db.String, nullable=False)
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
