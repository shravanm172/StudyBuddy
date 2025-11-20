from app import db
import enum

class GroupRequestStatus(enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

class GroupRequest(db.Model):
    __tablename__ = "group_requests"
    
    id = db.Column(db.Integer, primary_key=True)
    requester_uid = db.Column(db.String, db.ForeignKey("users.uid"), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey("groups.id"), nullable=False)
    status = db.Column(db.Enum(GroupRequestStatus), nullable=False, default=GroupRequestStatus.PENDING)
    message = db.Column(db.Text, nullable=True)  # Optional message with request
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())
    
    # Prevent duplicate pending requests from same user to same group
    __table_args__ = (
        db.UniqueConstraint('requester_uid', 'group_id', 'status', name='unique_pending_group_request'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'requester_uid': self.requester_uid,
            'group_id': self.group_id,
            'status': self.status.value,
            'message': self.message,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }