from app import create_app, db
from app.models.user import Course
# These are temporarily the list of all courses available in the system
COURSES = [
    ("CSE1001", "Intro to Programming"),
    ("CSE2010", "Data Structures"),
    ("CSE2410", "Software Engineering"),
    ("CSE4001", "Operating Systems"),
    ("PHY2002", "Physics II"),
]

def seed():
    app = create_app()
    with app.app_context():
        for course_id, title in COURSES:
            # Safe merge inserts or updates existing
            db.session.merge(Course(course_id=course_id, title=title))
        db.session.commit()
        print(f"Seeded {len(COURSES)} courses.")

if __name__ == "__main__":
    seed()
