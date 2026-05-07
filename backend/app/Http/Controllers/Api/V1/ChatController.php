<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChatController extends Controller
{
    private function chatTimestamp($date): ?string
    {
        return $date?->toJSON();
    }

    public function conversations(Request $request)
    {
        $user = $request->user();

        $conversations = Conversation::with(['customer', 'user'])
            ->orderBy('last_message_at', 'desc')
            ->get()
            ->map(function ($conv) use ($user) {
                // Lấy tin nhắn mới nhất trực tiếp từ database
                $lastMessage = Message::where('conversation_id', $conv->id)
                    ->orderBy('created_at', 'desc')
                    ->first();

                $unreadCount = Message::where('conversation_id', $conv->id)
                    ->where('is_read', false)
                    ->where('sender_type', '!=', 'user')
                    ->count();

                return [
                    'id' => $conv->id,
                    'customerId' => $conv->customer_id,
                    'customerName' => $conv->customer?->name ?? 'Unknown',
                    'customerPhone' => $conv->customer?->phone,
                    'customerAvatar' => $conv->customer?->avatar,
                    'userId' => $conv->user_id,
                    'userName' => $conv->user?->name,
                    'userAvatar' => $conv->user?->avatar,
                    'lastMessage' => $lastMessage?->message,
                    'lastMessageSenderType' => $lastMessage?->sender_type,
                    'lastMessageAt' => $this->chatTimestamp($conv->last_message_at),
                    'unreadCount' => $unreadCount,
                ];
            });

        return response()->json([
            'data' => $conversations,
        ]);
    }

    public function messages(Request $request, string $conversationId)
    {
        $messages = Message::where('conversation_id', $conversationId)
            ->with(['conversation.user', 'conversation.customer'])
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($msg) {
                $senderName = null;
                $senderAvatar = null;
                if ($msg->sender_type === 'user') {
                    $user = \App\Models\User::find($msg->sender_id);
                    $senderName = $user?->name;
                    $senderAvatar = $user?->avatar;
                } else {
                    $customer = \App\Models\Customer::find($msg->sender_id);
                    $senderName = $customer?->name;
                    $senderAvatar = $customer?->avatar;
                }
                return [
                    'id' => $msg->id,
                    'conversationId' => $msg->conversation_id,
                    'senderType' => $msg->sender_type,
                    'senderId' => $msg->sender_id,
                    'senderName' => $senderName,
                    'senderAvatar' => $senderAvatar,
                    'message' => $msg->message,
                    'isRead' => $msg->is_read,
                    'createdAt' => $this->chatTimestamp($msg->created_at),
                ];
            });

        Message::where('conversation_id', $conversationId)
            ->where('sender_type', '!=', 'user')
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'data' => $messages,
        ]);
    }

    public function sendMessage(Request $request)
    {
        $validated = $request->validate([
            'conversationId' => 'nullable|uuid|exists:conversations,id',
            'customerId' => 'nullable|uuid|exists:customers,id',
            'message' => 'required|string',
        ]);

        $authUser = $request->user();
        $isCustomer = $authUser instanceof \App\Models\Customer;

        if ($isCustomer) {
            $conversation = Conversation::firstOrCreate(
                ['customer_id' => $authUser->id]
            );

            $message = Message::create([
                'conversation_id' => $conversation->id,
                'sender_type' => 'customer',
                'sender_id' => $authUser->id,
                'message' => $validated['message'],
            ]);
        } else {
            // Admin/User gửi tin nhắn
            if (!empty($validated['conversationId'])) {
                $conversation = Conversation::findOrFail($validated['conversationId']);
                // gán user_id nếu chưa có
                if (!$conversation->user_id) {
                    $conversation->user_id = $authUser->id;
                    $conversation->save();
                }
            } elseif (!empty($validated['customerId'])) {
                $conversation = Conversation::firstOrCreate(
                    ['customer_id' => $validated['customerId']],
                    ['user_id' => $authUser->id]
                );
            } else {
                return response()->json(['message' => 'conversationId or customerId required'], 422);
            }

            $message = Message::create([
                'conversation_id' => $conversation->id,
                'sender_type' => 'user',
                'sender_id' => $authUser->id,
                'message' => $validated['message'],
            ]);
        }

        $conversation->update(['last_message_at' => now()]);

        // Lấy thông tin sender để trả về
        $senderName = null;
        $senderAvatar = null;
        if ($isCustomer) {
            $senderName = $authUser->name;
            $senderAvatar = $authUser->avatar;
        } else {
            $senderName = $authUser->name;
            $senderAvatar = $authUser->avatar;
        }

        return response()->json([
            'message' => 'Message sent successfully',
            'data' => [
                'id' => $message->id,
                'conversationId' => $message->conversation_id,
                'senderType' => $message->sender_type,
                'senderId' => $message->sender_id,
                'senderName' => $senderName,
                'senderAvatar' => $senderAvatar,
                'message' => $message->message,
                'isRead' => $message->is_read,
                'createdAt' => $this->chatTimestamp($message->created_at),
            ],
        ], 201);
    }

    public function customerConversation(Request $request)
    {
        $customer = $request->user();

        $conversation = Conversation::where('customer_id', $customer->id)
            ->with(['user', 'lastMessage'])
            ->first();

        if (!$conversation) {
            return response()->json([
                'data' => null,
            ]);
        }

        $unreadCount = Message::where('conversation_id', $conversation->id)
            ->where('is_read', false)
            ->where('sender_type', 'user')
            ->count();

        return response()->json([
            'data' => [
                'id' => $conversation->id,
                'userId' => $conversation->user_id,
                'userName' => $conversation->user?->name ?? 'Admin',
                'userAvatar' => $conversation->user?->avatar,
                'lastMessage' => $conversation->lastMessage?->message,
                'lastMessageAt' => $this->chatTimestamp($conversation->last_message_at),
                'unreadCount' => $unreadCount,
            ],
        ]);
    }

    public function customerMessages(Request $request)
    {
        $customer = $request->user();

        $conversation = Conversation::where('customer_id', $customer->id)->first();

        if (!$conversation) {
            return response()->json(['data' => []]);
        }

        $messages = Message::where('conversation_id', $conversation->id)
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($msg) {
                return [
                    'id' => $msg->id,
                    'conversationId' => $msg->conversation_id,
                    'senderType' => $msg->sender_type,
                    'senderId' => $msg->sender_id,
                    'message' => $msg->message,
                    'isRead' => (bool) $msg->is_read,
                    'createdAt' => $this->chatTimestamp($msg->created_at),
                ];
            });

        // KHÔNG mark as read ở đây nữa — dùng endpoint riêng

        return response()->json(['data' => $messages]);
    }

    // Đánh dấu đã đọc — chỉ gọi khi customer mở chat
    public function customerMarkRead(Request $request)
    {
        $customer = $request->user();

        $conversation = Conversation::where('customer_id', $customer->id)->first();

        if ($conversation) {
            Message::where('conversation_id', $conversation->id)
                ->where('sender_type', 'user')
                ->where('is_read', false)
                ->update(['is_read' => true]);
        }

        return response()->json(['message' => 'Marked as read']);
    }

    // Unread count cho customer
    public function customerUnreadCount(Request $request)
    {
        $customer = $request->user();

        $conversation = Conversation::where('customer_id', $customer->id)->first();

        if (!$conversation) {
            return response()->json(['count' => 0]);
        }

        $count = Message::where('conversation_id', $conversation->id)
            ->where('sender_type', 'user')
            ->where('is_read', false)
            ->count();

        return response()->json(['count' => $count]);
    }

    public function unreadCount(Request $request)
    {
        // Tổng tin nhắn từ customer chưa đọc (dùng cho Sidebar badge)
        $count = Message::whereHas('conversation')
            ->where('sender_type', 'customer')
            ->where('is_read', false)
            ->count();

        return response()->json([
            'count' => $count,
        ]);
    }

    public function updateMessage(Request $request, string $messageId)
    {
        $validated = $request->validate([
            'message' => 'required|string',
        ]);

        $message = Message::findOrFail($messageId);

        if ($message->sender_type !== 'user') {
            return response()->json([
                'message' => 'Only admin messages can be edited',
            ], 403);
        }

        $message->update([
            'message' => $validated['message'],
        ]);

        $user = \App\Models\User::find($message->sender_id);

        return response()->json([
            'message' => 'Message updated successfully',
            'data' => [
                'id' => $message->id,
                'conversationId' => $message->conversation_id,
                'senderType' => $message->sender_type,
                'senderId' => $message->sender_id,
                'senderName' => $user?->name,
                'senderAvatar' => $user?->avatar,
                'message' => $message->message,
                'isRead' => $message->is_read,
                'createdAt' => $this->chatTimestamp($message->created_at),
            ],
        ]);
    }

    public function deleteMessage(Request $request, string $messageId)
    {
        $message = Message::findOrFail($messageId);
        $conversationId = $message->conversation_id;
        $message->delete();

        // Cập nhật last_message_at của conversation
        $lastMessage = Message::where('conversation_id', $conversationId)
            ->orderBy('created_at', 'desc')
            ->first();

        if ($lastMessage) {
            Conversation::where('id', $conversationId)
                ->update(['last_message_at' => $lastMessage->created_at]);
        } else {
            // Nếu không còn tin nhắn nào, set last_message_at về null
            Conversation::where('id', $conversationId)
                ->update(['last_message_at' => null]);
        }

        return response()->json([
            'message' => 'Message deleted successfully',
        ]);
    }

    public function deleteConversation(Request $request, string $conversationId)
    {
        $conversation = Conversation::findOrFail($conversationId);
        
        // Xóa tất cả messages trong conversation
        Message::where('conversation_id', $conversationId)->delete();
        
        // Xóa conversation
        $conversation->delete();

        return response()->json([
            'message' => 'Conversation deleted successfully',
        ]);
    }
}
