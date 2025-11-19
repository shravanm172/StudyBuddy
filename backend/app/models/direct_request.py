from app import db
import enum

class RequestStatus(enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

class DirectRequest(db.Model):
    __tablename__ = "direct_requests"
    
    id = db.Column(db.Integer, primary_key=True)
    sender_uid = db.Column(db.String, db.ForeignKey("users.uid"), nullable=False)
    receiver_uid = db.Column(db.String, db.ForeignKey("users.uid"), nullable=False)
    status = db.Column(db.Enum(RequestStatus), nullable=False, default=RequestStatus.PENDING)
    message = db.Column(db.Text, nullable=True)  # Optional message with request
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())
    
    # No unique constraint - allow multiple requests between same users over time
    # Duplicate prevention for pending requests is handled in application logic