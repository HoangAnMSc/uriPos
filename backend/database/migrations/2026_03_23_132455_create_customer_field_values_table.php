<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_field_values', function (Blueprint $table) {
            $table->id();
            $table->uuid('customer_id');
            $table->unsignedBigInteger('content_field_id');
            $table->text('value')->nullable();
            $table->timestamps();

            $table->foreign('customer_id')
                ->references('id')
                ->on('customers')
                ->cascadeOnDelete();

            $table->foreign('content_field_id')
                ->references('id')
                ->on('content_fields')
                ->cascadeOnDelete();

            $table->unique(['customer_id', 'content_field_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_field_values');
    }
};