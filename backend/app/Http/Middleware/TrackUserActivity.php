<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TrackUserActivity
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var mixed $authUser */
        $authUser = $request->user();

        if ($authUser instanceof User) {
            $shouldTouch = !$authUser->last_seen_at
                || $authUser->last_seen_at->lt(now()->subMinute());

            if ($shouldTouch) {
                $authUser->forceFill([
                    'last_seen_at' => now(),
                ])->saveQuietly();
            }
        }

        return $next($request);
    }
}
