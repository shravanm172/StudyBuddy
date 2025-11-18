from app import db
from app.models.user import User, UserProfile, UserCourse, Course, Gender, Grade
from sqlalchemy.exc import IntegrityError


class UserRepo:
    @staticmethod
    def create_user_with_profile(uid, username, email, profile, courses):
        """
        Create or update a user + profile + enrolled courses.

        profile = {
            "date_of_birth": date object (datetime.date),
            "grade": Grade enum or string,
            "gender": Gender enum or string,
        }
        courses = [course_id, ...]
        """
        try:
            # Convert string values to enums if needed
            if isinstance(profile["grade"], str):
                profile["grade"] = Grade(profile["grade"])
            if isinstance(profile["gender"], str):
                profile["gender"] = Gender(profile["gender"])
                
            # Upsert user
            user = User.query.get(uid)
            if not user:
                user = User(uid=uid, username=username, email=email)
                db.session.add(user)
            else:
                user.username = username
                user.email = email

            # Upsert profile
            user_profile = UserProfile.query.get(uid)
            if not user_profile:
                user_profile = UserProfile(
                    uid=uid,
                    date_of_birth=profile["date_of_birth"],
                    grade=profile["grade"],
                    gender=profile["gender"],
                )
                db.session.add(user_profile)
            else:
                user_profile.date_of_birth = profile["date_of_birth"]
                user_profile.grade = profile["grade"]
                user_profile.gender = profile["gender"]

            # Replace course enrollments
            UserCourse.query.filter_by(uid=uid).delete()
            # de-dupe courses just in case
            for course_id in set(courses):
                db.session.add(UserCourse(uid=uid, course_id=course_id))

            db.session.commit()

        except IntegrityError as e:
            db.session.rollback()
            raise e
        except ValueError as e:
            db.session.rollback()
            raise ValueError(f"Invalid enum value: {e}")

    @staticmethod
    def get_user(uid):
        """
        Return user + profile + courses as a dict, or None if not found.
        """
        result = (
            db.session.query(User, UserProfile)
            .join(UserProfile, User.uid == UserProfile.uid)
            .filter(User.uid == uid)
            .first()
        )
        if not result:
            return None

        user_obj, profile = result
        courses = [
            uc.course_id for uc in UserCourse.query.filter_by(uid=uid).all()
        ]
        return {
            "uid": user_obj.uid,
            "username": user_obj.username,
            "email": user_obj.email,
            "date_of_birth": profile.date_of_birth.isoformat() if profile.date_of_birth else None,  # Convert to YYYY-MM-DD string
            "grade": profile.grade.value,  # Convert enum to string value
            "gender": profile.gender.value,  # Convert enum to string value
            "courses": courses,
        }

    @staticmethod
    def get_user_by_username(username):
        """
        Return user by username, or None if not found.
        """
        user = User.query.filter_by(username=username).first()
        if not user:
            return None
        return UserRepo.get_user(user.uid)

    @staticmethod
    def is_username_taken(username, exclude_uid=None):
        """
        Check if username is already taken by another user.
        """
        query = User.query.filter_by(username=username)
        if exclude_uid:
            query = query.filter(User.uid != exclude_uid)
        return query.first() is not None
