export interface ZaloMessage {
  sender: string | null;
  time_text: string | null;
  content: string;
  raw: string;
  image_urls: string[];
  image_files?: string[];
  is_sent: boolean;
  top: number;
}

export interface ZaloGroupMeta {
  id: string;
  name: string;
  messageCount: number;
  senderCount: number;
  mediaCount: number;
}

export interface ZaloFilterState {
  query: string;
  sender: string;
  hasMedia: boolean;
}
