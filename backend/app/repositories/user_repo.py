from app import db
from app.models.user import User, UserProfile, UserCourse, Course
from sqlalchemy.exc import IntegrityError

class UserRepo:
    @staticmethod
    def create_user_with_profile(uid, email, profile, courses):
        """
        profile = {age, grade, school, gender}
        courses = [course_id, ...]
        """
        try:
            user = User.query.get(uid)
            if not user:
                user = User(uid=uid, email=email)
                db.session.add(user)
            else:
                user.email = email

            # Create or update profile
            user_profile = UserProfile.query.get(uid)
            if not user_profile:
                user_profile = UserProfile(
                    uid=uid,
                    age=profile["age"],
                    grade=profile["grade"],
                    school=profile["school"],
                    gender=profile["gender"],
                )
                db.session.add(user_profile)
            else:
                user_profile.age = profile["age"]
                user_profile.grade = profile["grade"]
                user_profile.school = profile["school"]
                user_profile.gender = profile["gender"]

            # Replace course enrollments
            UserCourse.query.filter_by(uid=uid).delete()
            for course_id in courses:
                db.session.add(UserCourse(uid=uid, course_id=course_id))

            db.session.commit()

        except IntegrityError as e:
            db.session.rollback()
            raise e

    @staticmethod
    def get_user(uid):
        user = (
            db.session.query(User, UserProfile)
            .join(UserProfile, User.uid == UserProfile.uid)
            .filter(User.uid == uid)
            .first()
        )
        if not user:
            return None

        user_obj, profile = user
        courses = [
            uc.course_id for uc in UserCourse.query.filter_by(uid=uid).all()
        ]
        return {
            "uid": user_obj.uid,
            "email": user_obj.email,
            "age": profile.age,
            "grade": profile.grade,
            "school": profile.school,
            "gender": profile.gender,
            "courses": courses,
        }
