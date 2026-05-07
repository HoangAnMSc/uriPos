<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\RolePermissionController;
use App\Http\Controllers\Api\V1\AdminUserController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\DiscountCodeController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\SubCategoryController;
use App\Http\Controllers\Api\V1\ContentStructureController;
use App\Http\Controllers\Api\V1\ContentFieldController;
use App\Http\Controllers\Api\V1\PaymentSettingController;
use App\Http\Controllers\Api\V1\AppSettingController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\ChatController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\CustomerAuthController;
use App\Http\Controllers\Api\V1\ProductMediaController;

Route::get('/ping', function () {
    return response()->json([
        'success' => true,
        'message' => 'Ping successfull',
        'time' => now()->toDateTimeString(),
    ]);
});

Route::prefix("v1")->group(function () {
  Route::post("register", [AuthController::class, "register"]);
  Route::post("login", [AuthController::class, "login"]);

  // Customer Auth Routes
  Route::post("customer/login", [CustomerAuthController::class, "login"]);
  Route::post("customer/register", [CustomerAuthController::class, "register"]);

  // Public Routes (no auth required)
  Route::get("public/products", [ProductController::class, "index"]);
  Route::get("public/content-structures", [ContentStructureController::class, "index"]);

  Route::middleware(["auth:sanctum", "track.user.activity"])->group(function () {
    Route::get("me", [AuthController::class, "me"]);
    Route::post("logout", [AuthController::class, "logout"]);
    Route::patch("me/avatar", [AuthController::class, "updateAvatar"]);

    Route::get("dashboard", function () {
      return response()->json([
        "success" => true,
        "message" => "Welcome admin"
      ]);
    })->middleware("permission:dashboard.view");

    Route::get('orders', [OrderController::class, 'index'])
    ->middleware('permission:order.view');

    Route::get('orders/{id}', [OrderController::class, 'show'])
      ->middleware('permission:order.view');

    Route::post('orders', [OrderController::class, 'store'])
      ->middleware('permission:order.create');

    Route::get("users", [AdminUserController::class, "index"])
      ->middleware("permission:user.view");

    Route::post("users", [AdminUserController::class, "store"])
      ->middleware("permission:user.create");

    Route::patch("users/{id}", [AdminUserController::class, "update"])
      ->middleware("permission:user.update");

    Route::put("users/{id}/roles", [AdminUserController::class, "updateRoles"])
      ->middleware("permission:user.update");

    Route::delete("users/{id}", [AdminUserController::class, "destroy"])
      ->middleware("permission:user.delete");

    Route::get("roles", [RolePermissionController::class, "index"])
      ->middleware("permission:role.view");

    Route::post("roles", [RolePermissionController::class, "store"])
      ->middleware("permission:role.create");

    Route::put("roles/{id}", [RolePermissionController::class, "update"])
      ->middleware("permission:role.update");

    Route::delete("roles/{id}", [RolePermissionController::class, "destroy"])
      ->middleware("permission:role.delete");

    Route::get("permissions", [RolePermissionController::class, "permissions"])
      ->middleware("permission:role.view");

    Route::post("users/{userId}/roles", [RolePermissionController::class, "assignRolesToUser"])
      ->middleware("permission:user.update");

    Route::get("products", [ProductController::class, "index"])
      ->middleware("permission:product.view");

    Route::post("products", [ProductController::class, "store"])
      ->middleware("permission:product.create");

    Route::patch("products/{id}", [ProductController::class, "update"])
      ->middleware("permission:product.update");

    Route::delete("products/{id}", [ProductController::class, "destroy"])
      ->middleware("permission:product.delete");

    Route::get("product-media", [ProductMediaController::class, "index"]);
    Route::post("product-media", [ProductMediaController::class, "store"]);

    Route::get("discounts", [DiscountCodeController::class, "index"])
      ->middleware("permission:discount.view");

    Route::post("discounts", [DiscountCodeController::class, "store"])
      ->middleware("permission:discount.create");

    Route::patch("discounts/{id}", [DiscountCodeController::class, "update"])
      ->middleware("permission:discount.update");

    Route::delete("discounts/{id}", [DiscountCodeController::class, "destroy"])
      ->middleware("permission:discount.delete");

    Route::get('content-structures', [ContentStructureController::class, 'index'])
      ->middleware("permission:content.view");
    Route::post('content-structures', [ContentStructureController::class, 'store'])
      ->middleware("permission:content.create");
    Route::get('content-structures/{id}', [ContentStructureController::class, 'show'])
      ->middleware("permission:content.view");
    Route::put('content-structures/{id}', [ContentStructureController::class, 'update'])
      ->middleware("permission:content.update");
    Route::delete('content-structures/{id}', [ContentStructureController::class, 'destroy'])
      ->middleware("permission:content.delete");

    Route::post('content-structures/{structureId}/fields', [ContentFieldController::class, 'store'])
      ->middleware("permission:content.create");
    Route::put('content-structures/{structureId}/fields/{fieldId}', [ContentFieldController::class, 'update'])
      ->middleware("permission:content.update");
    Route::delete('content-structures/{structureId}/fields/{fieldId}', [ContentFieldController::class, 'destroy'])
      ->middleware("permission:content.delete");
    Route::post('content-structures/{structureId}/fields-reorder', [ContentFieldController::class, 'reorder'])
      ->middleware("permission:content.update");

    Route::post('content-fields/upload-image', [ContentFieldController::class, 'uploadImage'])
      ->middleware("permission:content.create");

    Route::get('payment-settings', [PaymentSettingController::class, "show"])
      ->middleware("permission:payment.view");
    Route::patch('payment-settings', [PaymentSettingController::class, "update"])
      ->middleware("permission:payment.update");

    Route::get('app-settings', [AppSettingController::class, "show"]);
    Route::patch('app-settings', [AppSettingController::class, "update"]);

    Route::get('customers', [CustomerController::class, 'index'])
      ->middleware("permission:customer.view");
    Route::get('customers/rank-settings', [CustomerController::class, 'rankSettings'])
      ->middleware("permission:customer.view");
    Route::patch('customers/rank-settings', [CustomerController::class, 'updateRankSettings'])
      ->middleware("permission:customer.update");
    Route::patch('customers/point-settings', [CustomerController::class, 'updatePointSettings'])
      ->middleware("permission:customer.update");
    Route::get('customers/{id}', [CustomerController::class, 'show'])
      ->middleware("permission:customer.view");
    Route::post('customers', [CustomerController::class, 'store'])
      ->middleware("permission:customer.create");
    Route::patch('customers/{id}', [CustomerController::class, 'update'])
      ->middleware("permission:customer.update");
    Route::delete('customers/{id}', [CustomerController::class, 'destroy'])
      ->middleware("permission:customer.delete");

    Route::get('notifications', [NotificationController::class, 'index'])
      ->middleware('permission:notification.view');
    Route::get('notifications/all', [NotificationController::class, 'adminIndex'])
      ->middleware('permission:notification.view');
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount'])
      ->middleware('permission:notification.view');
    Route::post('notifications', [NotificationController::class, 'store'])
      ->middleware('permission:notification.create');
    Route::patch('notifications/{id}/read', [NotificationController::class, 'markAsRead'])
      ->middleware('permission:notification.view');
    Route::post('notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])
      ->middleware('permission:notification.view');
    Route::delete('notifications/{id}', [NotificationController::class, 'destroy'])
      ->middleware('permission:notification.delete');
    Route::post('notifications/{id}/like', [NotificationController::class, 'toggleLike'])
      ->middleware('permission:notification.view');
    Route::get('notifications/{id}/likers', [NotificationController::class, 'likers'])
      ->middleware('permission:notification.view');
    Route::patch('notifications/{id}', [NotificationController::class, 'update'])
      ->middleware('permission:notification.update');

    Route::get('chat/conversations', [ChatController::class, 'conversations'])
      ->middleware('permission:chat.view');
    Route::get('chat/conversations/{conversationId}/messages', [ChatController::class, 'messages'])
      ->middleware('permission:chat.view');
    Route::post('chat/messages', [ChatController::class, 'sendMessage'])
      ->middleware('permission:chat.reply');
    Route::patch('chat/messages/{messageId}', [ChatController::class, 'updateMessage'])
      ->middleware('permission:chat.reply');
    Route::delete('chat/messages/{messageId}', [ChatController::class, 'deleteMessage'])
      ->middleware('permission:chat.delete');
    Route::delete('chat/conversations/{conversationId}', [ChatController::class, 'deleteConversation'])
      ->middleware('permission:chat.delete');
    Route::get('chat/unread-count', [ChatController::class, 'unreadCount'])
      ->middleware('permission:chat.view');
  });

  // Customer Protected Routes
  Route::middleware('auth:sanctum')->prefix('customer')->group(function () {
    Route::get('me', [CustomerAuthController::class, 'me']);
    Route::post('logout', [CustomerAuthController::class, 'logout']);
    Route::get('conversation', [ChatController::class, 'customerConversation']);
    Route::get('messages', [ChatController::class, 'customerMessages']);
    Route::post('messages', [ChatController::class, 'sendMessage']);
    Route::post('messages/mark-read', [ChatController::class, 'customerMarkRead']);
    Route::get('unread-count', [ChatController::class, 'customerUnreadCount']);

    // Cart
    Route::get('cart', [CartController::class, 'index']);
    Route::post('cart', [CartController::class, 'upsert']);
    Route::delete('cart', [CartController::class, 'clear']);
  });
});
