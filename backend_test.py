import requests
import sys
import os
import base64
from datetime import datetime
from pathlib import Path
import json

class CollageAPITester:
    def __init__(self, base_url="https://collage-maker-7.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.uploaded_photos = []
        self.uploaded_letterheads = []

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        if files is None and data is not None:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, data=data)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.text[:200]}")
                except:
                    pass

            return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def create_test_image(self):
        """Create a simple test image in base64 format"""
        # Create a simple 100x100 red square image
        from PIL import Image
        import io
        
        img = Image.new('RGB', (100, 100), color='red')
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        return buffer

    def test_photo_upload(self):
        """Test photo upload"""
        try:
            # Create test image
            test_image = self.create_test_image()
            
            files = {
                'file': ('test_photo.png', test_image, 'image/png')
            }
            
            success, response = self.run_test(
                "Photo Upload",
                "POST",
                "photos/upload",
                200,
                files=files
            )
            
            if success and 'id' in response:
                self.uploaded_photos.append(response)
                return response['id']
            return None
        except Exception as e:
            print(f"Error in photo upload test: {e}")
            return None

    def test_get_photos(self):
        """Test getting all photos"""
        success, response = self.run_test(
            "Get All Photos",
            "GET",
            "photos",
            200
        )
        return success

    def test_get_photo_file(self, photo_id):
        """Test getting photo file"""
        success, _ = self.run_test(
            "Get Photo File",
            "GET",
            f"photos/{photo_id}/file",
            200
        )
        return success

    def test_letterhead_upload(self):
        """Test letterhead upload"""
        try:
            # Create test image for letterhead
            test_image = self.create_test_image()
            
            files = {
                'file': ('test_letterhead.png', test_image, 'image/png')
            }
            
            # Send name as query parameter
            success, response = self.run_test(
                "Letterhead Upload",
                "POST",
                "letterheads/upload?name=Test%20Letterhead",
                200,
                files=files
            )
            
            if success and 'id' in response:
                self.uploaded_letterheads.append(response)
                return response['id']
            return None
        except Exception as e:
            print(f"Error in letterhead upload test: {e}")
            return None

    def test_get_letterheads(self):
        """Test getting all letterheads"""
        success, response = self.run_test(
            "Get All Letterheads",
            "GET",
            "letterheads",
            200
        )
        return success

    def test_image_processing(self):
        """Test image processing"""
        # Create a simple base64 image for processing
        test_data = {
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
            "operation": "rotate",
            "value": 90
        }
        
        success, response = self.run_test(
            "Image Processing - Rotate",
            "POST",
            "photos/process",
            200,
            data=test_data
        )
        return success

    def test_pdf_generation(self):
        """Test PDF generation"""
        if not self.uploaded_photos:
            print("⚠️  Skipping PDF generation test - no uploaded photos")
            return False
            
        test_data = {
            "project_id": "test-project-123",
            "images": [
                {
                    "id": self.uploaded_photos[0]['id'],
                    "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
                    "x": 0,
                    "y": 0,
                    "width": 100,
                    "height": 100
                }
            ]
        }
        
        if self.uploaded_letterheads:
            test_data["letterhead_id"] = self.uploaded_letterheads[0]['id']
        
        success, response = self.run_test(
            "PDF Generation",
            "POST",
            "pdf/generate",
            200,
            data=test_data
        )
        return success

    def test_delete_photo(self, photo_id):
        """Test photo deletion"""
        success, _ = self.run_test(
            "Delete Photo",
            "DELETE",
            f"photos/{photo_id}",
            200
        )
        return success

def main():
    print("🚀 Starting Photo Collage API Tests")
    print("=" * 50)
    
    # Setup
    tester = CollageAPITester()
    
    # Test photo upload
    photo_id = tester.test_photo_upload()
    
    # Test getting photos
    tester.test_get_photos()
    
    # Test getting photo file if we have a photo
    if photo_id:
        tester.test_get_photo_file(photo_id)
    
    # Test letterhead upload
    letterhead_id = tester.test_letterhead_upload()
    
    # Test getting letterheads
    tester.test_get_letterheads()
    
    # Test image processing
    tester.test_image_processing()
    
    # Test PDF generation
    tester.test_pdf_generation()
    
    # Test photo deletion if we have a photo
    if photo_id:
        tester.test_delete_photo(photo_id)
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())