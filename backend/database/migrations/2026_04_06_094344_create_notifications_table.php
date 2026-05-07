<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title')->default('');
            $table->text('message');
            $table->string('type')->default('info');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedInteger('like_count')->default(0);
            $table->string('recipient_type')->default('all'); // all | role | user
            $table->json('recipient_ids')->nullable(); // role IDs hoặc user IDs tùy recipient_type
            $table->timestamps();

            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });

        Schema::create('notification_user', function (Blueprint $table) {
            $table->id();
            $table->uuid('notification_id');
            $table->unsignedBigInteger('user_id');
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->foreign('notification_id')->references('id')->on('notifications')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->unique(['notification_id', 'user_id']);
        });

        Schema::create('notification_likes', function (Blueprint $table) {
            $table->id();
            $table->uuid('notification_id');
            $table->unsignedBigInteger('user_id');
            $table->timestamps();

            $table->foreign('notification_id')->references('id')->on('notifications')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->unique(['notification_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_likes');
        Schema::dropIfExists('notification_user');
        Schema::dropIfExists('notifications');
    }
};
