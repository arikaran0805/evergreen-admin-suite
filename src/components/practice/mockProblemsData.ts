import { SkillData } from './types';

export const skillProblemsData: Record<string, SkillData> = {
  sql: {
    id: 'sql',
    name: 'SQL',
    description: 'Master database queries and data manipulation',
    problems: [
      // Data Filtering
      { id: 'sql-1', title: 'Big Countries', difficulty: 'Easy', solved: true, locked: false, subTopic: 'Data Filtering', hasSolution: true },
      { id: 'sql-2', title: 'Recyclable and Low Fat Products', difficulty: 'Easy', solved: true, locked: false, subTopic: 'Data Filtering', hasSolution: true },
      { id: 'sql-3', title: 'Customers Who Never Order', difficulty: 'Easy', solved: true, locked: false, subTopic: 'Data Filtering', hasSolution: true },
      { id: 'sql-4', title: 'Article Views I', difficulty: 'Easy', solved: true, locked: false, subTopic: 'Data Filtering', hasSolution: true },
      // String Methods
      { id: 'sql-5', title: 'Invalid Tweets', difficulty: 'Easy', solved: true, locked: false, subTopic: 'String Methods', hasSolution: true },
      { id: 'sql-6', title: 'Calculate Special Bonus', difficulty: 'Easy', solved: true, locked: false, subTopic: 'String Methods', hasSolution: true },
      { id: 'sql-7', title: 'Fix Names in a Table', difficulty: 'Easy', solved: true, locked: false, subTopic: 'String Methods', hasSolution: true },
      { id: 'sql-8', title: 'Find Users With Valid E-Mails', difficulty: 'Easy', solved: false, locked: false, subTopic: 'String Methods', hasSolution: true },
      { id: 'sql-9', title: 'Patients With a Condition', difficulty: 'Easy', solved: false, locked: false, subTopic: 'String Methods', hasSolution: true },
      // Aggregations
      { id: 'sql-10', title: 'Count Occurrences in Text', difficulty: 'Medium', solved: false, locked: true, subTopic: 'Strengthen Your Learning by Solving this Question', hasSolution: true },
      { id: 'sql-11', title: 'Average Selling Price', difficulty: 'Medium', solved: false, locked: false, subTopic: 'Aggregations', hasSolution: true },
      { id: 'sql-12', title: 'Project Employees I', difficulty: 'Easy', solved: false, locked: false, subTopic: 'Aggregations', hasSolution: true },
      { id: 'sql-13', title: 'Percentage of Users Attended a Contest', difficulty: 'Easy', solved: false, locked: false, subTopic: 'Aggregations', hasSolution: true },
      // Joins
      { id: 'sql-14', title: 'Replace Employee ID With The Unique Identifier', difficulty: 'Easy', solved: false, locked: false, subTopic: 'Joins', hasSolution: true },
      { id: 'sql-15', title: 'Product Sales Analysis I', difficulty: 'Easy', solved: false, locked: false, subTopic: 'Joins', hasSolution: true },
      { id: 'sql-16', title: 'Student and Examinations', difficulty: 'Medium', solved: false, locked: false, subTopic: 'Joins', hasSolution: true },
      { id: 'sql-17', title: 'Managers with at Least 5 Direct Reports', difficulty: 'Medium', solved: false, locked: true, subTopic: 'Joins', hasSolution: true },
    ],
  },
  algorithms: {
    id: 'algorithms',
    name: 'Algorithms',
    description: 'Learn fundamental algorithms and problem-solving techniques',
    problems: [
      // Arrays
      { id: 'algo-1', title: 'Two Sum', difficulty: 'Easy', solved: true, locked: false, subTopic: 'Arrays', hasSolution: true },
      { id: 'algo-2', title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy', solved: true, locked: false, subTopic: 'Arrays', hasSolution: true },
      { id: 'algo-3', title: 'Contains Duplicate', difficulty: 'Easy', solved: false, locked: false, subTopic: 'Arrays', hasSolution: true },
      { id: 'algo-4', title: 'Product of Array Except Self', difficulty: 'Medium', solved: false, locked: false, subTopic: 'Arrays', hasSolution: true },
      { id: 'algo-5', title: 'Maximum Subarray', difficulty: 'Medium', solved: false, locked: false, subTopic: 'Arrays', hasSolution: true },
      // Sorting
      { id: 'algo-6', title: 'Merge Intervals', difficulty: 'Medium', solved: false, locked: false, subTopic: 'Sorting', hasSolution: true },
      { id: 'algo-7', title: 'Sort Colors', difficulty: 'Medium', solved: false, locked: false, subTopic: 'Sorting', hasSolution: true },
      { id: 'algo-8', title: 'Kth Largest Element', difficulty: 'Medium', solved: false, locked: true, subTopic: 'Sorting', hasSolution: true },
      // Binary Search
      { id: 'algo-9', title: 'Binary Search', difficulty: 'Easy', solved: true, locked: false, subTopic: 'Binary Search', hasSolution: true },
      { id: 'algo-10', title: 'Search in Rotated Sorted Array', difficulty: 'Medium', solved: false, locked: false, subTopic: 'Binary Search', hasSolution: true },
      { id: 'algo-11', title: 'Find Minimum in Rotated Sorted Array', difficulty: 'Medium', solved: false, locked: false, subTopic: 'Binary Search', hasSolution: true },
      // Dynamic Programming
      { id: 'algo-12', title: 'Climbing Stairs', difficulty: 'Easy', solved: true, locked: false, subTopic: 'Dynamic Programming', hasSolution: true },
      { id: 'algo-13', title: 'House Robber', difficulty: 'Medium', solved: false, locked: false, subTopic: 'Dynamic Programming', hasSolution: true },
      { id: 'algo-14', title: 'Coin Change', difficulty: 'Medium', solved: false, locked: false, subTopic: 'Dynamic Programming', hasSolution: true },
      { id: 'algo-15', title: 'Longest Increasing Subsequence', difficulty: 'Medium', solved: false, locked: true, subTopic: 'Dynamic Programming', hasSolution: true },
    ],
  },
  'data-structures': {
    id: 'data-structures',
    name: 'Data Structures',
    description: 'Master essential data structures for efficient problem solving',
    problems: [
      // Linked Lists
      { id: 'ds-1', title: 'Reverse Linked List', difficulty: 'Easy', solved: true, locked: false, subTopic: 'Linked Lists', hasSolution: true },
      { id: 'ds-2', title: 'Merge Two Sorted Lists', difficulty: 'Easy', solved: true, locked: false, subTopic: 'Linked Lists', hasSolution: true },
      { id: 'ds-3', title: 'Linked List Cycle', difficulty: 'Easy', solved: false, locked: false, subTopic: 'Linked Lists', hasSolution: true },
      { id: 'ds-4', title: 'Remove Nth Node From End', difficulty: 'Medium', solved: false, locked: false, subTopic: 'Linked Lists', hasSolution: true },
      // Trees
      { id: 'ds-5', title: 'Maximum Depth of Binary Tree', difficulty: 'Easy', solved: true, locked: false, subTopic: 'Trees', hasSolution: true },
      { id: 'ds-6', title: 'Invert Binary Tree', difficulty: 'Easy', solved: false, locked: false, subTopic: 'Trees', hasSolution: true },
      { id: 'ds-7', title: 'Validate Binary Search Tree', difficulty: 'Medium', solved: false, locked: false, subTopic: 'Trees', hasSolution: true },
      { id: 'ds-8', title: 'Binary Tree Level Order Traversal', difficulty: 'Medium', solved: false, locked: true, subTopic: 'Trees', hasSolution: true },
      // Stacks & Queues
      { id: 'ds-9', title: 'Valid Parentheses', difficulty: 'Easy', solved: true, locked: false, subTopic: 'Stacks & Queues', hasSolution: true },
      { id: 'ds-10', title: 'Min Stack', difficulty: 'Medium', solved: false, locked: false, subTopic: 'Stacks & Queues', hasSolution: true },
      { id: 'ds-11', title: 'Implement Queue using Stacks', difficulty: 'Easy', solved: false, locked: false, subTopic: 'Stacks & Queues', hasSolution: true },
      // Hash Tables
      { id: 'ds-12', title: 'Valid Anagram', difficulty: 'Easy', solved: true, locked: false, subTopic: 'Hash Tables', hasSolution: true },
      { id: 'ds-13', title: 'Group Anagrams', difficulty: 'Medium', solved: false, locked: false, subTopic: 'Hash Tables', hasSolution: true },
      { id: 'ds-14', title: 'Top K Frequent Elements', difficulty: 'Medium', solved: false, locked: true, subTopic: 'Hash Tables', hasSolution: true },
    ],
  },
  python: {
    id: 'python',
    name: 'Python',
    description: 'Practice Python programming fundamentals and advanced concepts',
    problems: [
      { id: 'py-1', title: 'Hello World', difficulty: 'Easy', solved: true, locked: false, subTopic: 'Basics', hasSolution: true },
      { id: 'py-2', title: 'FizzBuzz', difficulty: 'Easy', solved: true, locked: false, subTopic: 'Basics', hasSolution: true },
      { id: 'py-3', title: 'Palindrome Check', difficulty: 'Easy', solved: false, locked: false, subTopic: 'Strings', hasSolution: true },
      { id: 'py-4', title: 'List Comprehensions', difficulty: 'Easy', solved: false, locked: false, subTopic: 'Lists', hasSolution: true },
      { id: 'py-5', title: 'Dictionary Operations', difficulty: 'Medium', solved: false, locked: false, subTopic: 'Dictionaries', hasSolution: true },
      { id: 'py-6', title: 'Lambda Functions', difficulty: 'Medium', solved: false, locked: true, subTopic: 'Functions', hasSolution: true },
    ],
  },
  mathematics: {
    id: 'mathematics',
    name: 'Mathematics',
    description: 'Solve mathematical and numerical problems',
    problems: [
      { id: 'math-1', title: 'Fizz Buzz', difficulty: 'Easy', solved: true, locked: false, subTopic: 'Basic Math', hasSolution: true },
      { id: 'math-2', title: 'Count Primes', difficulty: 'Medium', solved: false, locked: false, subTopic: 'Number Theory', hasSolution: true },
      { id: 'math-3', title: 'Power of Three', difficulty: 'Easy', solved: false, locked: false, subTopic: 'Basic Math', hasSolution: true },
      { id: 'math-4', title: 'Happy Number', difficulty: 'Easy', solved: false, locked: false, subTopic: 'Number Theory', hasSolution: true },
      { id: 'math-5', title: 'Factorial Trailing Zeroes', difficulty: 'Medium', solved: false, locked: true, subTopic: 'Number Theory', hasSolution: true },
    ],
  },
};

// Default data for skills without specific problems
export const getSkillData = (skillId: string): SkillData => {
  const data = skillProblemsData[skillId];
  if (data) return data;
  
  // Generate default data for other skills
  return {
    id: skillId,
    name: skillId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    description: `Practice ${skillId} problems`,
    problems: [
      { id: `${skillId}-1`, title: 'Introduction Problem', difficulty: 'Easy', solved: false, locked: false, subTopic: 'Getting Started', hasSolution: true },
      { id: `${skillId}-2`, title: 'Basic Challenge', difficulty: 'Easy', solved: false, locked: false, subTopic: 'Getting Started', hasSolution: true },
      { id: `${skillId}-3`, title: 'Intermediate Problem', difficulty: 'Medium', solved: false, locked: false, subTopic: 'Core Concepts', hasSolution: true },
      { id: `${skillId}-4`, title: 'Advanced Challenge', difficulty: 'Hard', solved: false, locked: true, subTopic: 'Advanced Topics', hasSolution: true },
    ],
  };
};
