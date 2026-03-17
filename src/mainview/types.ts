export type FileEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};
