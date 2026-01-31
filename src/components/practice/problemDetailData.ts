export interface ProblemDetail {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  constraints: string[];
  hints?: string[];
  starterCode: Record<string, string>;
  testCases: {
    input: string;
    expected: string;
  }[];
}

export const problemDetails: Record<string, ProblemDetail> = {
  'sql-1': {
    id: 'sql-1',
    title: 'Big Countries',
    difficulty: 'Easy',
    description: `A country is **big** if:
- it has an area of at least three million (i.e., \`3000000 km²\`), or
- it has a population of at least twenty-five million (i.e., \`25000000\`).

Write a solution to find the name, population, and area of the **big countries**.

Return the result table in **any order**.`,
    examples: [
      {
        input: `World table:
+-------------+-----------+---------+------------+--------------+
| name        | continent | area    | population | gdp          |
+-------------+-----------+---------+------------+--------------+
| Afghanistan | Asia      | 652230  | 25500100   | 20343000000  |
| Albania     | Europe    | 28748   | 2831741    | 12960000000  |
| Algeria     | Africa    | 2381741 | 37100000   | 188681000000 |
| Andorra     | Europe    | 468     | 78115      | 3712000000   |
| Angola      | Africa    | 1246700 | 20609294   | 100990000000 |
+-------------+-----------+---------+------------+--------------+`,
        output: `+-------------+------------+---------+
| name        | population | area    |
+-------------+------------+---------+
| Afghanistan | 25500100   | 652230  |
| Algeria     | 37100000   | 2381741 |
+-------------+------------+---------+`,
      },
    ],
    constraints: [
      'The result table can be in any order.',
    ],
    hints: [
      'Think about using the OR operator to combine multiple conditions.',
      'You need to select rows where either area >= 3000000 OR population >= 25000000.',
    ],
    starterCode: {
      sql: `-- Write your SQL query here
SELECT name, population, area
FROM World
WHERE `,
      mysql: `# Write your MySQL query statement below
SELECT name, population, area
FROM World
WHERE `,
    },
    testCases: [
      { input: 'Default test case', expected: 'Afghanistan, Algeria' },
    ],
  },
  'algo-1': {
    id: 'algo-1',
    title: 'Two Sum',
    difficulty: 'Easy',
    description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.

You may assume that each input would have **exactly one solution**, and you may not use the *same* element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
      },
      {
        input: 'nums = [3,3], target = 6',
        output: '[0,1]',
      },
    ],
    constraints: [
      '2 <= nums.length <= 10⁴',
      '-10⁹ <= nums[i] <= 10⁹',
      '-10⁹ <= target <= 10⁹',
      'Only one valid answer exists.',
    ],
    hints: [
      'A brute force approach would be to iterate through each element and check if there exists another element that sums to the target.',
      'Can you optimize using a hash map to store values you\'ve seen?',
    ],
    starterCode: {
      python: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Write your code here
        pass`,
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Write your code here
};`,
      typescript: `function twoSum(nums: number[], target: number): number[] {
    // Write your code here
};`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your code here
    }
}`,
      cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your code here
    }
};`,
    },
    testCases: [
      { input: 'nums = [2,7,11,15], target = 9', expected: '[0,1]' },
      { input: 'nums = [3,2,4], target = 6', expected: '[1,2]' },
      { input: 'nums = [3,3], target = 6', expected: '[0,1]' },
    ],
  },
  'ds-1': {
    id: 'ds-1',
    title: 'Reverse Linked List',
    difficulty: 'Easy',
    description: `Given the \`head\` of a singly linked list, reverse the list, and return *the reversed list*.`,
    examples: [
      {
        input: 'head = [1,2,3,4,5]',
        output: '[5,4,3,2,1]',
      },
      {
        input: 'head = [1,2]',
        output: '[2,1]',
      },
      {
        input: 'head = []',
        output: '[]',
      },
    ],
    constraints: [
      'The number of nodes in the list is the range [0, 5000].',
      '-5000 <= Node.val <= 5000',
    ],
    hints: [
      'Think about how you can reverse the pointers while traversing the list.',
      'You\'ll need to keep track of the previous node as you iterate.',
    ],
    starterCode: {
      python: `# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next
class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        # Write your code here
        pass`,
      javascript: `/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} head
 * @return {ListNode}
 */
var reverseList = function(head) {
    // Write your code here
};`,
    },
    testCases: [
      { input: 'head = [1,2,3,4,5]', expected: '[5,4,3,2,1]' },
      { input: 'head = [1,2]', expected: '[2,1]' },
    ],
  },
};

export const getDefaultProblemDetail = (id: string, title: string, difficulty: 'Easy' | 'Medium' | 'Hard'): ProblemDetail => ({
  id,
  title,
  difficulty,
  description: `This is a placeholder problem. The actual problem description will be loaded from the database.

Write a solution that solves this problem efficiently.`,
  examples: [
    {
      input: 'Example input',
      output: 'Expected output',
      explanation: 'Explanation of the solution.',
    },
  ],
  constraints: [
    'Constraint 1',
    'Constraint 2',
  ],
  starterCode: {
    python: `class Solution:
    def solve(self):
        # Write your code here
        pass`,
    javascript: `function solve() {
    // Write your code here
}`,
  },
  testCases: [
    { input: 'Test input', expected: 'Expected output' },
  ],
});

export const getProblemDetail = (id: string): ProblemDetail | null => {
  return problemDetails[id] || null;
};
