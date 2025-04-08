export interface FriendRequest {
  sender_user_id: string;
  receiver_user_id: string; 
  user_email: string;
  user_name: string;
  avatar: string;
  message: string;
  created_at: string;
  status: number;
}