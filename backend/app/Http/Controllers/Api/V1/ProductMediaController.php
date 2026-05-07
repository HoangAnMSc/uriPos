<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\CloudinaryMediaService;
use Illuminate\Http\Request;

class ProductMediaController extends Controller
{
    public function index(Request $request, CloudinaryMediaService $cloudinaryMedia)
    {
        $user = $request->user();
        $canAccess = $user && (
            $user->hasPermission('product.view')
            || $user->hasPermission('product.create')
            || $user->hasPermission('product.update')
        );

        abort_unless($canAccess, 403);

        $data = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:60'],
            'next_cursor' => ['nullable', 'string', 'max:255'],
        ]);

        $result = $cloudinaryMedia->listImages(
            prefix: 'apos/',
            maxResults: (int) ($data['limit'] ?? 24),
            nextCursor: $data['next_cursor'] ?? null,
        );

        return response()->json([
            'data' => $result['resources'],
            'next_cursor' => $result['next_cursor'],
        ]);
    }

    public function store(Request $request, CloudinaryMediaService $cloudinaryMedia)
    {
        $user = $request->user();
        $canUpload = $user
            && ($user->hasPermission('product.create') || $user->hasPermission('product.update'));

        abort_unless($canUpload, 403);

        $request->validate([
            'image' => ['required', 'image', 'max:4096'],
        ]);

        $result = $cloudinaryMedia->uploadImage(
            $request->file('image'),
            'apos/products',
        );

        return response()->json([
            'message' => 'Upload success',
            'data' => [
                'id' => (string) ($result['asset_id'] ?? $result['public_id'] ?? ''),
                'public_id' => (string) ($result['public_id'] ?? ''),
                'url' => (string) ($result['secure_url'] ?? ''),
                'width' => (int) ($result['width'] ?? 0),
                'height' => (int) ($result['height'] ?? 0),
                'bytes' => (int) ($result['bytes'] ?? 0),
                'format' => (string) ($result['format'] ?? ''),
                'folder' => (string) ($result['folder'] ?? ''),
                'created_at' => $result['created_at'] ?? now()->toISOString(),
            ],
        ], 201);
    }
}
