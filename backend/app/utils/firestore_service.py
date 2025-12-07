"""
Firestore service for managing chat-related data synchronization
"""
import os
import logging
from firebase_admin import credentials, firestore, initialize_app
import firebase_admin

# Configure logging
logger = logging.getLogger(__name__)

class FirestoreService:
    def __init__(self):
        self.db = None
        self._initialize_firestore()
    
    def _initialize_firestore(self):
        """
        Initialize Firestore with service account credentials
        
        """
        try:
            # Check if Firebase is already initialized
            if not firebase_admin._apps:
                # Path to service account key
                cred_path = os.path.join(
                    os.path.dirname(os.path.dirname(__file__)), 
                    'serviceAccountKey.json'
                )
                
                if os.path.exists(cred_path):
                    cred = credentials.Certificate(cred_path)
                    initialize_app(cred)
                    logger.info("Firebase Admin SDK initialized successfully")
                else:
                    logger.error(f"Service account key not found at: {cred_path}")
                    raise FileNotFoundError("Firebase service account key not found")
            
            # Get Firestore client
            self.db = firestore.client()
            logger.info("Firestore client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Firestore: {str(e)}")
            raise
    
    def sync_group_member_add(self, group_id: str, user_uid: str, username: str = None, role: str = "member"):
        """
        Add a user to the group's member list in Firestore to enable them to access the group chat

        """
        try:
            member_doc_id = f"{group_id}_{user_uid}"
            member_data = {
                'group_id': group_id,
                'user_uid': user_uid,
                'username': username or f"User_{user_uid[:8]}",
                'role': role,
                'added_at': firestore.SERVER_TIMESTAMP,
                'is_active': True
            }
            
            # Add to groupMembers collection 
            self.db.collection('groupMembers').document(member_doc_id).set(member_data)
            
            logger.info(f"Added user {user_uid} to group {group_id} in Firestore")
            return True
            
        except Exception as e:
            logger.error(f"Failed to sync group member add: {str(e)}")
            return False
    
    def sync_group_member_remove(self, group_id: str, user_uid: str):
        """
        Remove a user from the group's member list in Firestore which revokes their access to the group chat

        """
        try:
            member_doc_id = f"{group_id}_{user_uid}"
            
            # Remove from groupMembers collection
            self.db.collection('groupMembers').document(member_doc_id).delete()
            
            # Also clean up any typing indicators for this user in this group
            typing_ref = self.db.collection('groups').document(str(group_id)).collection('typing').document(user_uid)
            typing_ref.delete()
            
            logger.info(f"Removed user {user_uid} from group {group_id} in Firestore")
            return True
            
        except Exception as e:
            logger.error(f"Failed to sync group member remove: {str(e)}")
            return False
    
    def sync_all_group_members(self, group_id: str, members_list: list):
        """
        Sync all members of a group to Firestore for intial setup or full refresh.
        
        """
        try:
            batch = self.db.batch()
            
            # First, get existing members to determine what to add/remove
            existing_members = {}
            members_ref = self.db.collection('groupMembers')
            query = members_ref.where('group_id', '==', group_id)
            
            for doc in query.stream():
                data = doc.to_dict()
                existing_members[data['user_uid']] = doc.id
            
            # Track current member UIDs
            current_member_uids = {member.get('user_uid') for member in members_list if member.get('user_uid')}
            
            # Add or update current members
            for member in members_list:
                user_uid = member.get('user_uid')
                if not user_uid:
                    continue
                    
                member_doc_id = f"{group_id}_{user_uid}"
                member_data = {
                    'group_id': group_id,
                    'user_uid': user_uid,
                    'username': member.get('username', f"User_{user_uid[:8]}"),
                    'role': member.get('role', 'member'),
                    'added_at': firestore.SERVER_TIMESTAMP,
                    'is_active': True
                }
                
                member_ref = self.db.collection('groupMembers').document(member_doc_id)
                batch.set(member_ref, member_data)
            
            # Remove members who are no longer in the group
            for existing_uid, doc_id in existing_members.items():
                if existing_uid not in current_member_uids:
                    doc_ref = self.db.collection('groupMembers').document(doc_id)
                    batch.delete(doc_ref)
            
            # Commit the batch
            batch.commit()
            
            logger.info(f"Synced all members for group {group_id} to Firestore")
            return True
            
        except Exception as e:
            logger.error(f"Failed to sync all group members: {str(e)}")
            return False
    
    def get_group_members_from_firestore(self, group_id: str):
        """
        Get all members of a group from Firestore

        """
        try:
            members = []
            members_ref = self.db.collection('groupMembers')
            query = members_ref.where('group_id', '==', group_id).where('is_active', '==', True)
            
            for doc in query.stream():
                members.append(doc.to_dict())
            
            return members
            
        except Exception as e:
            logger.error(f"Failed to get group members from Firestore: {str(e)}")
            return []
    
    def cleanup_group_chat_data(self, group_id: str):
        """
        Clean up all chat data for a group when the group is deleted

        """
        try:
            batch = self.db.batch()
            
            # Remove all group members
            members_ref = self.db.collection('groupMembers')
            query = members_ref.where('group_id', '==', group_id)
            for doc in query.stream():
                batch.delete(doc.reference)
            
            # Remove all messages (in subcollection)
            messages_ref = self.db.collection('groups').document(str(group_id)).collection('messages')
            for doc in messages_ref.stream():
                batch.delete(doc.reference)
            
            # Remove all typing indicators
            typing_ref = self.db.collection('groups').document(str(group_id)).collection('typing')
            for doc in typing_ref.stream():
                batch.delete(doc.reference)
            
            # Remove the group document itself
            group_ref = self.db.collection('groups').document(str(group_id))
            batch.delete(group_ref)
            
            batch.commit()
            
            logger.info(f"Cleaned up all chat data for group {group_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cleanup group chat data: {str(e)}")
            return False


# Create a single instance oif FirestoreService to be used throughout the app
firestore_service = FirestoreService()