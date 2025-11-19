# app/models/group.py
from datetime import datetime
from enum import Enum
from app import db

class GroupRole(Enum):
    ADMIN = "admin"
    MEMBER = "member"

class GroupPrivacy(Enum):
    PUBLIC = "public"      # Auto-join allowed
    PRIVATE = "private"    # Admin approval required

class Group(db.Model):
    __tablename__ = 'groups'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # Visibility and privacy settings
    is_visible = db.Column(db.Boolean, default=True, nullable=False)  # Visible on group feed
    privacy = db.Column(db.Enum(GroupPrivacy), default=GroupPrivacy.PRIVATE, nullable=False)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    members = db.relationship('GroupMember', back_populates='group', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Group {self.id}: {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'is_visible': self.is_visible,
            'privacy': self.privacy.value,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'member_count': len(self.members)
        }


class GroupMember(db.Model):
    __tablename__ = 'group_members'
    
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=False)
    user_uid = db.Column(db.String(128), nullable=False)  # Firebase UID
    role = db.Column(db.Enum(GroupRole), default=GroupRole.MEMBER, nullable=False)
    
    # Timestamps
    joined_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    group = db.relationship('Group', back_populates='members')
    
    # Constraints
    __table_args__ = (
        db.UniqueConstraint('group_id', 'user_uid', name='unique_group_member'),
    )
    
    def __repr__(self):
        return f'<GroupMember {self.user_uid} in Group {self.group_id} as {self.role.value}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'group_id': self.group_id,
            'user_uid': self.user_uid,
            'role': self.role.value,
            'joined_at': self.joined_at.isoformat()
        }