export interface FriendRequest {
  sender_user_id: number;
  receiver_user_id: number; 
  user_email: string;
  user_name: string;
  avatar: string;
  message: string;
  created_at: string;
  status: number;
};

export interface Friend {
  id: number;
  email: string;
  name: string;
  avatar: string;
  deleted?: boolean;
};