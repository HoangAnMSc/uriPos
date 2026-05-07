<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable()->after('avatar');
            }

            if (!Schema::hasColumn('users', 'last_seen_at')) {
                $table->timestamp('last_seen_at')->nullable()->after('last_login_at');
            }

            if (!Schema::hasColumn('users', 'last_logout_at')) {
                $table->timestamp('last_logout_at')->nullable()->after('last_seen_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = [];

            if (Schema::hasColumn('users', 'last_login_at')) {
                $columns[] = 'last_login_at';
            }

            if (Schema::hasColumn('users', 'last_seen_at')) {
                $columns[] = 'last_seen_at';
            }

            if (Schema::hasColumn('users', 'last_logout_at')) {
                $columns[] = 'last_logout_at';
            }

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
