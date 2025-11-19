"""add_courses_to_groups

Revision ID: a27f21fc7e07
Revises: 97dbdfecc242
Create Date: 2025-11-18 22:21:49.455790

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a27f21fc7e07'
down_revision = '97dbdfecc242'
branch_labels = None
depends_on = None


def upgrade():
    # Create group_courses association table for many-to-many relationship
    op.create_table('group_courses',
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.String(), nullable=False),  # Changed to String to match Course model
        sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.current_timestamp()),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['course_id'], ['courses.course_id'], ondelete='CASCADE'),  # Fixed reference
        sa.PrimaryKeyConstraint('group_id', 'course_id')
    )
    # Create index for better query performance
    op.create_index('idx_group_courses_group_id', 'group_courses', ['group_id'])
    op.create_index('idx_group_courses_course_id', 'group_courses', ['course_id'])


def downgrade():
    # Drop indexes first
    op.drop_index('idx_group_courses_course_id', 'group_courses')
    op.drop_index('idx_group_courses_group_id', 'group_courses')
    # Drop the association table
    op.drop_table('group_courses')
