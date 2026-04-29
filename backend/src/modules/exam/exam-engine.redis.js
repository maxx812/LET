export const redisKeys = {
  attemptAnswers: (examId, userId) => `exam:${examId}:attempt:${userId}:answers`,
  attemptMeta: (examId, userId) => `exam:${examId}:attempt:${userId}:meta`,
  attemptDirtySet: (examId) => `exam:${examId}:attempts:dirty`,
  dirtyExamIndex: () => "exam:attempts:dirty:index",
  leaderboardZSet: (examId) => `exam:${examId}:leaderboard:zset`,
  leaderboardMeta: (examId) => `exam:${examId}:leaderboard:meta`,
  leaderboardDirtyIndex: () => "exam:leaderboards:dirty:index",
  participants: (examId) => `exam:${examId}:participants`,
  examRuntimeState: (examId) => `exam:${examId}:runtime`
};
