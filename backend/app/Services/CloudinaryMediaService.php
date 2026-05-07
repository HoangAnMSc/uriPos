<?php

namespace App\Services;

use Cloudinary\Cloudinary;
use Illuminate\Http\UploadedFile;

class CloudinaryMediaService
{
    private function client(): Cloudinary
    {
        return new Cloudinary([
            'cloud' => [
                'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
                'api_key' => env('CLOUDINARY_API_KEY'),
                'api_secret' => env('CLOUDINARY_API_SECRET'),
            ],
            'url' => [
                'secure' => true,
            ],
        ]);
    }

    public function uploadImage(
        UploadedFile $file,
        string $folder = 'apos/products',
        array $options = []
    ): array {
        return $this->client()->uploadApi()->upload(
            $file->getRealPath(),
            array_merge(
                [
                    'folder' => $folder,
                    'resource_type' => 'image',
                ],
                $options,
            ),
        );
    }

    public function listImages(
        string $prefix = 'apos/',
        int $maxResults = 30,
        ?string $nextCursor = null
    ): array {
        $response = $this->client()->adminApi()->assets([
            'type' => 'upload',
            'prefix' => $prefix,
            'max_results' => max(1, min($maxResults, 60)),
            'direction' => 'desc',
            'next_cursor' => $nextCursor,
        ]);

        $resources = $response->offsetGet('resources') ?? [];

        return [
            'resources' => array_values(
                array_filter(
                    array_map(fn (array $resource) => $this->normalizeResource($resource), $resources),
                ),
            ),
            'next_cursor' => $response->offsetExists('next_cursor')
                ? $response->offsetGet('next_cursor')
                : null,
        ];
    }

    private function normalizeResource(array $resource): ?array
    {
        if (($resource['resource_type'] ?? 'image') !== 'image') {
            return null;
        }

        return [
            'id' => (string) ($resource['asset_id'] ?? $resource['public_id'] ?? ''),
            'public_id' => (string) ($resource['public_id'] ?? ''),
            'url' => (string) ($resource['secure_url'] ?? ''),
            'width' => (int) ($resource['width'] ?? 0),
            'height' => (int) ($resource['height'] ?? 0),
            'bytes' => (int) ($resource['bytes'] ?? 0),
            'format' => (string) ($resource['format'] ?? ''),
            'folder' => (string) ($resource['folder'] ?? ''),
            'created_at' => $resource['created_at'] ?? null,
        ];
    }
}
