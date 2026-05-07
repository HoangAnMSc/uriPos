<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('phone');
            $table->string('avatar')->nullable();
            $table->unsignedBigInteger('content_structure_id')->nullable();
            $table->timestamps();

            $table->foreign('content_structure_id')
                ->references('id')
                ->on('content_structures')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};