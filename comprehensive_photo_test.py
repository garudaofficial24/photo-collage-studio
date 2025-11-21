import requests
import sys
import os
import base64
from datetime import datetime
from pathlib import Path
import json
from PIL import Image
import io

class ComprehensivePhotoTester:
    def __init__(self, base_url="https://collage-maker-7.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.uploaded_photos = []
        self.failed_tests = []

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            self.failed_tests.append(f"{test_name}: {details}")
            print(f"❌ {test_name} - FAILED: {details}")

    def create_test_image(self, width=100, height=100, color='red', format='PNG'):
        """Create a test image with specified parameters"""
        img = Image.new('RGB', (width, height), color=color)
        buffer = io.BytesIO()
        img.save(buffer, format=format)
        buffer.seek(0)
        return buffer

    def create_large_test_image(self):
        """Create a large test image (>5MB)"""
        # Create a 2000x2000 image to ensure it's large
        img = Image.new('RGB', (2000, 2000), color='blue')
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        return buffer

    def test_single_photo_upload(self):
        """Test 1: Single photo upload"""
        print("\n🔍 Test 1: Single Photo Upload")
        try:
            test_image = self.create_test_image()
            files = {'file': ('single_test.png', test_image, 'image/png')}
            
            response = requests.post(f"{self.api_url}/photos/upload", files=files)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['id', 'filename', 'uploaded_at']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Single Photo Upload", False, f"Missing fields: {missing_fields}")
                else:
                    self.uploaded_photos.append(data)
                    self.log_result("Single Photo Upload", True)
                    print(f"   Photo ID: {data['id']}")
                    print(f"   Filename: {data['filename']}")
                    return data['id']
            else:
                self.log_result("Single Photo Upload", False, f"Status {response.status_code}: {response.text[:100]}")
                
        except Exception as e:
            self.log_result("Single Photo Upload", False, str(e))
        return None

    def test_multiple_photos_upload(self):
        """Test 2: Multiple photos upload (3-5 photos)"""
        print("\n🔍 Test 2: Multiple Photos Upload")
        uploaded_ids = []
        
        for i in range(3):
            try:
                test_image = self.create_test_image(color=['red', 'green', 'blue'][i])
                files = {'file': (f'multi_test_{i+1}.png', test_image, 'image/png')}
                
                response = requests.post(f"{self.api_url}/photos/upload", files=files)
                
                if response.status_code == 200:
                    data = response.json()
                    uploaded_ids.append(data['id'])
                    self.uploaded_photos.append(data)
                else:
                    self.log_result(f"Multiple Upload #{i+1}", False, f"Status {response.status_code}")
                    return []
                    
            except Exception as e:
                self.log_result(f"Multiple Upload #{i+1}", False, str(e))
                return []
        
        self.log_result("Multiple Photos Upload", True, f"Uploaded {len(uploaded_ids)} photos")
        return uploaded_ids

    def test_different_formats(self):
        """Test 3: Different image formats (JPG, PNG, JPEG)"""
        print("\n🔍 Test 3: Different Image Formats")
        formats = [
            ('PNG', 'image/png', 'test.png'),
            ('JPEG', 'image/jpeg', 'test.jpg'),
            ('JPEG', 'image/jpeg', 'test.jpeg')
        ]
        
        success_count = 0
        for format_name, mime_type, filename in formats:
            try:
                test_image = self.create_test_image(format=format_name)
                files = {'file': (filename, test_image, mime_type)}
                
                response = requests.post(f"{self.api_url}/photos/upload", files=files)
                
                if response.status_code == 200:
                    data = response.json()
                    self.uploaded_photos.append(data)
                    success_count += 1
                    print(f"   ✅ {format_name} format uploaded successfully")
                else:
                    print(f"   ❌ {format_name} format failed: Status {response.status_code}")
                    
            except Exception as e:
                print(f"   ❌ {format_name} format failed: {str(e)}")
        
        self.log_result("Different Image Formats", success_count == len(formats), 
                       f"{success_count}/{len(formats)} formats successful")

    def test_large_file_upload(self):
        """Test 4: Large file upload (>5MB)"""
        print("\n🔍 Test 4: Large File Upload (>5MB)")
        try:
            large_image = self.create_large_test_image()
            file_size = len(large_image.getvalue())
            print(f"   File size: {file_size / (1024*1024):.2f} MB")
            
            files = {'file': ('large_test.png', large_image, 'image/png')}
            
            response = requests.post(f"{self.api_url}/photos/upload", files=files, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                self.uploaded_photos.append(data)
                self.log_result("Large File Upload", True)
                print(f"   Photo ID: {data['id']}")
            else:
                self.log_result("Large File Upload", False, f"Status {response.status_code}: {response.text[:100]}")
                
        except Exception as e:
            self.log_result("Large File Upload", False, str(e))

    def test_photo_list_retrieval(self):
        """Test 5: Photo list retrieval"""
        print("\n🔍 Test 5: Photo List Retrieval")
        try:
            response = requests.get(f"{self.api_url}/photos")
            
            if response.status_code == 200:
                photos = response.json()
                
                if isinstance(photos, list):
                    print(f"   Retrieved {len(photos)} photos")
                    
                    # Check if our uploaded photos are in the list
                    uploaded_ids = [photo['id'] for photo in self.uploaded_photos]
                    found_ids = [photo['id'] for photo in photos if photo['id'] in uploaded_ids]
                    
                    if len(found_ids) == len(uploaded_ids):
                        self.log_result("Photo List Retrieval", True)
                        
                        # Verify structure of first photo if available
                        if photos:
                            first_photo = photos[0]
                            required_fields = ['id', 'filename', 'uploaded_at']
                            missing_fields = [field for field in required_fields if field not in first_photo]
                            
                            if missing_fields:
                                print(f"   ⚠️  Missing fields in photo structure: {missing_fields}")
                            else:
                                print(f"   ✅ Photo structure is valid")
                    else:
                        self.log_result("Photo List Retrieval", False, 
                                       f"Only found {len(found_ids)}/{len(uploaded_ids)} uploaded photos")
                else:
                    self.log_result("Photo List Retrieval", False, "Response is not an array")
            else:
                self.log_result("Photo List Retrieval", False, f"Status {response.status_code}")
                
        except Exception as e:
            self.log_result("Photo List Retrieval", False, str(e))

    def test_photo_file_access(self):
        """Test 6: Photo file access"""
        print("\n🔍 Test 6: Photo File Access")
        if not self.uploaded_photos:
            self.log_result("Photo File Access", False, "No uploaded photos to test")
            return
            
        photo = self.uploaded_photos[0]
        try:
            response = requests.get(f"{self.api_url}/photos/{photo['id']}/file")
            
            if response.status_code == 200:
                # Check CORS headers
                cors_headers = {
                    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                    'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
                }
                
                print(f"   CORS Headers: {cors_headers}")
                
                # Check if content is an image
                content_type = response.headers.get('content-type', '')
                if 'image' in content_type:
                    self.log_result("Photo File Access", True)
                    print(f"   Content-Type: {content_type}")
                    print(f"   Content-Length: {len(response.content)} bytes")
                else:
                    self.log_result("Photo File Access", False, f"Invalid content-type: {content_type}")
            else:
                self.log_result("Photo File Access", False, f"Status {response.status_code}")
                
        except Exception as e:
            self.log_result("Photo File Access", False, str(e))

    def test_photo_deletion(self):
        """Test 7: Photo deletion"""
        print("\n🔍 Test 7: Photo Deletion")
        if not self.uploaded_photos:
            self.log_result("Photo Deletion", False, "No uploaded photos to delete")
            return
            
        # Test deleting an existing photo
        photo_to_delete = self.uploaded_photos[0]
        try:
            response = requests.delete(f"{self.api_url}/photos/{photo_to_delete['id']}")
            
            if response.status_code == 200:
                # Verify photo is deleted by trying to access it
                verify_response = requests.get(f"{self.api_url}/photos/{photo_to_delete['id']}/file")
                
                if verify_response.status_code == 404:
                    self.log_result("Photo Deletion", True)
                    print(f"   Deleted photo ID: {photo_to_delete['id']}")
                    
                    # Remove from our list
                    self.uploaded_photos.remove(photo_to_delete)
                else:
                    self.log_result("Photo Deletion", False, "Photo still accessible after deletion")
            else:
                self.log_result("Photo Deletion", False, f"Status {response.status_code}")
                
        except Exception as e:
            self.log_result("Photo Deletion", False, str(e))

    def test_delete_nonexistent_photo(self):
        """Test 8: Delete non-existent photo (should return 404)"""
        print("\n🔍 Test 8: Delete Non-existent Photo")
        fake_id = "non-existent-photo-id-12345"
        
        try:
            response = requests.delete(f"{self.api_url}/photos/{fake_id}")
            
            if response.status_code == 404:
                self.log_result("Delete Non-existent Photo", True)
                print(f"   Correctly returned 404 for fake ID: {fake_id}")
            else:
                self.log_result("Delete Non-existent Photo", False, 
                               f"Expected 404, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Delete Non-existent Photo", False, str(e))

    def test_photo_list_after_deletion(self):
        """Test 9: Verify photo list updated after deletion"""
        print("\n🔍 Test 9: Photo List After Deletion")
        try:
            response = requests.get(f"{self.api_url}/photos")
            
            if response.status_code == 200:
                photos = response.json()
                current_ids = [photo['id'] for photo in photos]
                remaining_uploaded_ids = [photo['id'] for photo in self.uploaded_photos]
                
                # Check that remaining uploaded photos are still in the list
                found_remaining = [photo_id for photo_id in remaining_uploaded_ids if photo_id in current_ids]
                
                if len(found_remaining) == len(remaining_uploaded_ids):
                    self.log_result("Photo List After Deletion", True)
                    print(f"   {len(found_remaining)} remaining photos found in list")
                else:
                    self.log_result("Photo List After Deletion", False, 
                                   f"Only {len(found_remaining)}/{len(remaining_uploaded_ids)} remaining photos found")
            else:
                self.log_result("Photo List After Deletion", False, f"Status {response.status_code}")
                
        except Exception as e:
            self.log_result("Photo List After Deletion", False, str(e))

    def cleanup_remaining_photos(self):
        """Clean up remaining test photos"""
        print("\n🧹 Cleaning up remaining test photos...")
        for photo in self.uploaded_photos[:]:
            try:
                response = requests.delete(f"{self.api_url}/photos/{photo['id']}")
                if response.status_code == 200:
                    print(f"   ✅ Cleaned up photo: {photo['id']}")
                    self.uploaded_photos.remove(photo)
                else:
                    print(f"   ⚠️  Failed to cleanup photo: {photo['id']}")
            except Exception as e:
                print(f"   ⚠️  Error cleaning up photo {photo['id']}: {e}")

    def run_all_tests(self):
        """Run all comprehensive photo tests"""
        print("🚀 Starting Comprehensive Photo API Tests")
        print("=" * 60)
        
        # Test 1: Single photo upload
        self.test_single_photo_upload()
        
        # Test 2: Multiple photos upload
        self.test_multiple_photos_upload()
        
        # Test 3: Different formats
        self.test_different_formats()
        
        # Test 4: Large file upload
        self.test_large_file_upload()
        
        # Test 5: Photo list retrieval
        self.test_photo_list_retrieval()
        
        # Test 6: Photo file access
        self.test_photo_file_access()
        
        # Test 7: Photo deletion
        self.test_photo_deletion()
        
        # Test 8: Delete non-existent photo
        self.test_delete_nonexistent_photo()
        
        # Test 9: Photo list after deletion
        self.test_photo_list_after_deletion()
        
        # Cleanup
        self.cleanup_remaining_photos()
        
        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failed_test in self.failed_tests:
                print(f"   • {failed_test}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All comprehensive photo tests passed!")
            return 0
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = ComprehensivePhotoTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())