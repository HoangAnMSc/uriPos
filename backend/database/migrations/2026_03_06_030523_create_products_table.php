<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('sku')->unique();
            $table->string('name');
            $table->string('thumbnail')->nullable();
            $table->foreignId('content_structure_id')
                ->nullable()
                ->constrained('content_structures')
                ->nullOnDelete();

            $table->decimal('price', 12, 2)->default(0);
            $table->text('short_desc')->nullable();
            $table->boolean('publish')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};