/**
 * StudyBuddy Group Ranking Engine for Group Feed
 * 
 * For now, simple ranking algorithm that ranks groups by the number of shared courses with the user. 
 * 
 * RANKING ALGORITHM:
 * Groups are sorted by the count of courses they share with the user.
 * Higher shared course count = higher ranking.
 */

export function getSharedCoursesWithGroup(userCourses, group) {
  if (!userCourses || !group || !group.courses) return [];
  
  const groupCourseIds = group.courses.map(course => course.course_id);
  return userCourses.filter(course => groupCourseIds.includes(course));
}

export function rankGroups(userCourses, groups) {
  if (!userCourses || !groups || groups.length === 0) return [];
  
  // Add shared course information to each group
  const groupsWithSharedInfo = groups.map(group => {
    const sharedCourses = getSharedCoursesWithGroup(userCourses, group);
    
    return {
      ...group,
      sharedCourses,
      sharedCoursesCount: sharedCourses.length
    };
  });
  
  // Sort by shared courses count (highest first)
  groupsWithSharedInfo.sort((a, b) => {
    return b.sharedCoursesCount - a.sharedCoursesCount;
  });
  
  return groupsWithSharedInfo;
}