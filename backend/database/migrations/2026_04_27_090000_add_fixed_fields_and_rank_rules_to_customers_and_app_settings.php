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
        Schema::table('customers', function (Blueprint $table) {
            if (!Schema::hasColumn('customers', 'address')) {
                $table->text('address')->nullable()->after('phone');
            }

            if (!Schema::hasColumn('customers', 'loyalty_points')) {
                $table->unsignedInteger('loyalty_points')->default(0)->after('address');
            }
        });

        Schema::table('app_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('app_settings', 'customer_rank_rules')) {
                $table->json('customer_rank_rules')->nullable()->after('border_radius');
            }
        });

        $this->backfillCustomerAddress();
        $this->backfillCustomerPoints();

        DB::table('app_settings')
            ->whereNull('customer_rank_rules')
            ->update([
                'customer_rank_rules' => json_encode(CustomerRankDefaults::RULES, JSON_UNESCAPED_UNICODE),
            ]);
    }

    public function down(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            if (Schema::hasColumn('app_settings', 'customer_rank_rules')) {
                $table->dropColumn('customer_rank_rules');
            }
        });

        Schema::table('customers', function (Blueprint $table) {
            $columns = [];

            if (Schema::hasColumn('customers', 'address')) {
                $columns[] = 'address';
            }

            if (Schema::hasColumn('customers', 'loyalty_points')) {
                $columns[] = 'loyalty_points';
            }

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }

    private function backfillCustomerAddress(): void
    {
        if (!Schema::hasTable('customer_field_values') || !Schema::hasTable('content_fields')) {
            return;
        }

        $addressFieldIds = DB::table('content_fields')
            ->where('slug', 'address')
            ->pluck('id');

        if ($addressFieldIds->isEmpty()) {
            return;
        }

        DB::table('customer_field_values')
            ->whereIn('content_field_id', $addressFieldIds)
            ->whereNotNull('value')
            ->orderBy('id')
            ->get(['customer_id', 'value'])
            ->each(function ($row) {
                $address = trim((string) $row->value);

                if ($address === '') {
                    return;
                }

                DB::table('customers')
                    ->where('id', $row->customer_id)
                    ->where(function ($query) {
                        $query->whereNull('address')
                            ->orWhere('address', '');
                    })
                    ->update(['address' => $address]);
            });
    }

    private function backfillCustomerPoints(): void
    {
        if (!Schema::hasTable('customer_field_values') || !Schema::hasTable('content_fields')) {
            return;
        }

        $pointsFieldIds = DB::table('content_fields')
            ->where('slug', 'loyalty_points')
            ->pluck('id');

        if ($pointsFieldIds->isEmpty()) {
            return;
        }

        DB::table('customer_field_values')
            ->whereIn('content_field_id', $pointsFieldIds)
            ->whereNotNull('value')
            ->orderBy('id')
            ->get(['customer_id', 'value'])
            ->each(function ($row) {
                $points = max(0, (int) $row->value);

                DB::table('customers')
                    ->where('id', $row->customer_id)
                    ->update(['loyalty_points' => $points]);
            });
    }
};
