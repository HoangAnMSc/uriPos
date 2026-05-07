<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {

            if (!Schema::hasColumn('orders', 'payment_method')) {
                $table->string('payment_method')->nullable()->after('discount_code');
            }

            if (!Schema::hasColumn('orders', 'cash_received')) {
                $table->decimal('cash_received', 12, 2)->nullable()->after('payment_method');
            }

            if (!Schema::hasColumn('orders', 'change_amount')) {
                $table->decimal('change_amount', 12, 2)->nullable()->after('cash_received');
            }

        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {

            $columns = [];

            if (Schema::hasColumn('orders', 'payment_method')) {
                $columns[] = 'payment_method';
            }

            if (Schema::hasColumn('orders', 'cash_received')) {
                $columns[] = 'cash_received';
            }

            if (Schema::hasColumn('orders', 'change_amount')) {
                $columns[] = 'change_amount';
            }

            if (!empty($columns)) {
                $table->dropColumn($columns);
            }

        });
    }
};