<?php

use App\Support\CustomerRankDefaults;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('app_settings', 'customer_point_exchange_amount')) {
                $table->unsignedInteger('customer_point_exchange_amount')
                    ->default(CustomerRankDefaults::SPEND_AMOUNT_PER_POINT)
                    ->after('customer_rank_rules');
            }
        });

        DB::table('app_settings')
            ->whereNull('customer_point_exchange_amount')
            ->orWhere('customer_point_exchange_amount', '<=', 0)
            ->update([
                'customer_point_exchange_amount' => CustomerRankDefaults::SPEND_AMOUNT_PER_POINT,
            ]);
    }

    public function down(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            if (Schema::hasColumn('app_settings', 'customer_point_exchange_amount')) {
                $table->dropColumn('customer_point_exchange_amount');
            }
        });
    }
};
