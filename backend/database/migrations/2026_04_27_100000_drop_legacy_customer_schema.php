<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('content_structures')) {
            $customerStructureIds = DB::table('content_structures')
                ->where('slug', 'customer')
                ->pluck('id');

            if ($customerStructureIds->isNotEmpty() && Schema::hasTable('content_fields')) {
                DB::table('content_fields')
                    ->whereIn('content_structure_id', $customerStructureIds)
                    ->delete();
            }

            if ($customerStructureIds->isNotEmpty()) {
                DB::table('content_structures')
                    ->whereIn('id', $customerStructureIds)
                    ->delete();
            }
        }

        if (Schema::hasTable('customer_field_values')) {
            Schema::drop('customer_field_values');
        }

        if (Schema::hasColumn('customers', 'content_structure_id')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->dropForeign(['content_structure_id']);
            });

            Schema::table('customers', function (Blueprint $table) {
                $table->dropColumn('content_structure_id');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('customer_field_values')) {
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

        if (!Schema::hasColumn('customers', 'content_structure_id')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->unsignedBigInteger('content_structure_id')->nullable()->after('avatar');
            });

            Schema::table('customers', function (Blueprint $table) {
                $table->foreign('content_structure_id')
                    ->references('id')
                    ->on('content_structures')
                    ->nullOnDelete();
            });
        }
    }
};
