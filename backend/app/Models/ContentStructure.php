<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContentStructure extends Model
{
    protected $fillable = [
        'name',
        'slug',
    ];

    public function fields(): HasMany
    {
        return $this->hasMany(ContentField::class)->orderBy('sort_order');
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}