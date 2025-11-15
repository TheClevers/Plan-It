export type Category = string;

export interface Todo {
  id: string;
  text: string;
  category: Category;
  completed: boolean;
}

export interface CompletedTask {
  id: string;
  text: string;
  category: Category;
  completedAt: Date;
}
