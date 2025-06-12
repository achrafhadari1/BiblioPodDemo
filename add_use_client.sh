#!/bin/bash

# Script to add 'use client' directive to components that use useRouter

echo "Adding 'use client' directive to components that use useRouter..."

# Find all JSX and JS files that use useRouter
find /workspace/BiblioPod_V2/nextjs/src -name "*.jsx" -o -name "*.js" | while read file; do
    if grep -q "useRouter" "$file" && ! grep -q '"use client"' "$file"; then
        echo "Adding 'use client' to: $file"
        
        # Create a backup
        cp "$file" "$file.bak2"
        
        # Add 'use client' at the beginning of the file
        sed -i '1i"use client";' "$file"
        
        echo "Added 'use client' to: $file"
    fi
done

echo "Use client directive addition complete!"