<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_field_values', function (Blueprint $table) {
            $table->id();
            $table->uuid('product_id');
            $table->foreignId('content_field_id')->constrained('content_fields')->cascadeOnDelete();
            $table->longText('value')->nullable();
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->unique(['product_id', 'content_field_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_field_values');
    }
};