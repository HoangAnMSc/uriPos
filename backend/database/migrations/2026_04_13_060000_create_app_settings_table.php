<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('app_settings', function (Blueprint $table) {
            $table->id();
            $table->string('theme')->default('light');
            $table->longText('logo_url')->nullable();
            $table->string('logo_text', 3)->default('A');
            $table->string('brand_name')->default('APOS PANEL');
            $table->string('font_family')->default('Inter');
            $table->json('font_sizes');
            $table->string('sidebar_color')->default('dark');
            $table->string('sidebar_custom_from', 7)->default('#1C1C1E');
            $table->string('sidebar_custom_to', 7)->default('#2C2C2E');
            $table->string('sidebar_active_color', 7)->default('#16A34A');
            $table->string('accent_color', 7)->default('#16A34A');
            $table->string('border_radius')->default('md');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_settings');
    }
};
