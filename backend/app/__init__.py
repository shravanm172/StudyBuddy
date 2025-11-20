from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

db = SQLAlchemy(session_options={"autoflush": False})
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # EXPLICIT CORS CONFIGURATION FOR FRONTEND
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
                "supports_credentials": True
            }
        }
    )
    
    # Adding explicit CORS headers to all responses
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    db.init_app(app)
    migrate.init_app(app, db)

    # Import models so Flask-Migrate can detect them
    from app.models import user  
    from app.models import direct_request  
    from app.models import group
    from app.models import group_request

    # Register controllers
    from app.controllers.user_controller import bp as user_bp
    from app.controllers.account_controller import bp as account_bp
    from app.controllers.direct_request_controller import bp as direct_request_bp
    from app.controllers.group_controller import bp as group_bp
    from app.controllers.group_request_controller import bp as group_request_bp
    from app.controllers.course_controller import bp as course_bp
    app.register_blueprint(user_bp)
    app.register_blueprint(account_bp)
    app.register_blueprint(direct_request_bp)
    app.register_blueprint(group_bp)
    app.register_blueprint(group_request_bp)
    app.register_blueprint(course_bp)

    return app
