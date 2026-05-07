<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('content_fields', function (Blueprint $table) {
            $table->id();

            $table->foreignId('content_structure_id')
                ->constrained('content_structures')
                ->cascadeOnDelete();

            $table->string('name', 190);
            $table->string('slug', 190);
            $table->string('type', 60);
            $table->boolean('required')->default(false);
            $table->string('description', 255)->nullable();
            $table->json('options')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['content_structure_id', 'slug']);
            $table->index(['content_structure_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_fields');
    }
};