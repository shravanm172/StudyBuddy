/**
 * StudyBuddy People Ranking Engine for People Feed
 * 
 * 
 * COMPATIBILITY SCORE CALCULATION: 
 * The compatibility score is calculated using multiple weighted factors:
 * 
 * 1. SHARED COURSES COUNT (Weight: 1.0 per course)
 *    - +1 point for each shared course
 * 
 * 2. GRADE LEVEL MATCH (Weight: 1.0)
 *    - +1.0 if users are in the same grade level
 *
 * Only users who share at least ONE course with the current user are included
 * in the ranked results. This ensures all recommendations are relevant.
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

export function getSharedCourses(currentUserCourses, targetUserCourses) {
  if (!currentUserCourses || !targetUserCourses) return [];
  
  return currentUserCourses.filter(course => targetUserCourses.includes(course));
}

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
      compatibilityScore: Math.round(score * 100) / 100,
      sharedCourses,
      age
    };
  });
  
  // Sort by compatibility score, then by username for consistency
  scoredUsers.sort((a, b) => {
    if (b.compatibilityScore !== a.compatibilityScore) {
      return b.compatibilityScore - a.compatibilityScore;
    }
    return (a.username || '').localeCompare(b.username || '');
  });
  
  return scoredUsers;
}

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