<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::create('discount_codes', function (Blueprint $table) {
        $table->id();
        $table->string('code')->unique();
        $table->enum('type', ['percent', 'fixed']);
        $table->decimal('value', 10, 2);
        $table->decimal('min_subtotal', 10, 2)->default(0);
        $table->decimal('max_discount', 10, 2)->nullable();
        $table->boolean('active')->default(true);
        $table->timestamps();
    });
  }

  public function down(): void {
    Schema::dropIfExists('discount_codes');
  }
};