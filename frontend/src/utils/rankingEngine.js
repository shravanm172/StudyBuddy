// src/utils/rankingEngine.js

/**
 * StudyBuddy Ranking Engine
 * 
 * This module implements the compatibility scoring algorithm for matching users
 * based on shared courses and similar characteristics.
 * 
 * COMPATIBILITY SCORE CALCULATION:
 * ================================
 * 
 * The compatibility score is calculated using multiple weighted factors:
 * 
 * 1. SHARED COURSES COUNT (Weight: 1.0 per course)
 *    - Simple count: +1 point for each shared course
 *    - Example: If User A has [CS101, MATH201, ENG101] and User B has [CS101, MATH201, HIST101]
 *      - Shared: 2 courses (CS101, MATH201)
 *      - Score contribution: 2 × 1.0 = 2.0 points
 * 
 * 2. GRADE LEVEL MATCH (Weight: 1.0)
 *    - Binary bonus: +1.0 if users are in the same grade level
 *    - Example: Both are "junior" → +1.0 points
 * 
 * FILTERING:
 * ==========
 * Only users who share at least ONE course with the current user are included
 * in the ranked results. This ensures all recommendations are relevant.
 * 
 * EXAMPLE CALCULATION:
 * ===================
 * Current User: {courses: ["CS101", "MATH201", "ENG101"], grade: "junior"}
 * Target User:  {courses: ["CS101", "MATH201", "HIST101"], grade: "junior"}
 * 
 * 1. Shared courses: 2 (CS101, MATH201)
 * 2. Shared courses score: 2 × 1.0 = 2.0
 * 3. Grade match bonus: +1.0 (both junior)
 * 4. Total compatibility score: 2.0 + 1.0 = 3.0
 * 
 * This simplified approach makes it easy to understand: more shared courses = higher compatibility!
 */

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Calculate compatibility score between current user and another user
 */
export function calculateUserScore(currentUser, targetUser) {
  if (!currentUser || !targetUser) return 0;
  
  let score = 0;
  
  // Get user courses
  const currentCourses = currentUser.courses || [];
  const targetCourses = targetUser.courses || [];
  
  // Calculate shared courses count (weight: 1.0 per course)
  const sharedCoursesCount = currentCourses.filter(course => 
    targetCourses.includes(course)
  ).length;
  
  score += sharedCoursesCount * 1.0;
  
  // Grade level match bonus (weight: 1.0)
  if (currentUser.grade === targetUser.grade) {
    score += 1.0;
  }
  
  return score;
}

/**
 * Get shared courses between two users
 */
export function getSharedCourses(currentUserCourses, targetUserCourses) {
  if (!currentUserCourses || !targetUserCourses) return [];
  
  return currentUserCourses.filter(course => targetUserCourses.includes(course));
}

/**
 * Rank and filter users based on compatibility with current user
 */
export function rankUsers(currentUser, potentialUsers) {
  if (!currentUser || !potentialUsers) return [];
  
  // Filter users who share at least one course with current user
  const usersWithSharedCourses = potentialUsers.filter(user => {
    const sharedCourses = getSharedCourses(currentUser.courses, user.courses);
    return sharedCourses.length > 0;
  });
  
  // Calculate scores and add metadata
  const scoredUsers = usersWithSharedCourses.map(user => {
    const score = calculateUserScore(currentUser, user);
    const sharedCourses = getSharedCourses(currentUser.courses, user.courses);
    const age = calculateAge(user.date_of_birth);
    
    return {
      ...user,
      compatibilityScore: Math.round(score * 100) / 100, // Round to 2 decimal places
      sharedCourses,
      age
    };
  });
  
  // Sort by score (highest first), then by username for consistency
  scoredUsers.sort((a, b) => {
    if (b.compatibilityScore !== a.compatibilityScore) {
      return b.compatibilityScore - a.compatibilityScore;
    }
    return (a.username || '').localeCompare(b.username || '');
  });
  
  return scoredUsers;
}

/**
 * Format grade for display
 */
export function formatGrade(grade) {
  if (!grade) return '';
  
  const gradeMap = {
    'freshman': 'Freshman',
    'sophomore': 'Sophomore', 
    'junior': 'Junior',
    'senior': 'Senior',
    'postgraduate': 'Postgraduate'
  };
  
  return gradeMap[grade] || grade;
}

/**
 * Format gender for display
 */
export function formatGender(gender) {
  if (!gender) return '';
  
  const genderMap = {
    'male': 'Male',
    'female': 'Female',
    'non_binary': 'Non-Binary',
    'prefer_not_to_say': 'Prefer not to say'
  };
  
  return genderMap[gender] || gender;
}