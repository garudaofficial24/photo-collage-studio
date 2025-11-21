import requests
import sys
import os
import base64
from datetime import datetime
from pathlib import Path
import json
from PIL import Image
import io

class EdgeCasePhotoTester:
    def __init__(self, base_url="https://collage-maker-7.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
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

    def create_actual_large_image(self):
        """Create an actual large image (>5MB)"""
        # Create a 3000x3000 image with high quality to ensure >5MB
        img = Image.new('RGB', (3000, 3000), color='blue')
        
        # Add some complexity to increase file size
        for i in range(0, 3000, 100):
            for j in range(0, 3000, 100):
                color = (i % 255, j % 255, (i+j) % 255)
                for x in range(i, min(i+50, 3000)):
                    for y in range(j, min(j+50, 3000)):
                        img.putpixel((x, y), color)
        
        buffer = io.BytesIO()
        img.save(buffer, format='PNG', optimize=False)
        buffer.seek(0)
        return buffer

    def test_actual_large_file(self):
        """Test with actual large file (>5MB)"""
        print("\n🔍 Edge Case 1: Actual Large File Upload (>5MB)")
        try:
            large_image = self.create_actual_large_image()
            file_size = len(large_image.getvalue())
            print(f"   File size: {file_size / (1024*1024):.2f} MB")
            
            if file_size < 5 * 1024 * 1024:
                print(f"   ⚠️  File is only {file_size / (1024*1024):.2f} MB, creating larger...")
                # Create an even larger image
                img = Image.new('RGB', (4000, 4000), color='red')
                buffer = io.BytesIO()
                img.save(buffer, format='PNG', optimize=False)
                buffer.seek(0)
                large_image = buffer
                file_size = len(large_image.getvalue())
                print(f"   New file size: {file_size / (1024*1024):.2f} MB")
            
            files = {'file': ('actual_large_test.png', large_image, 'image/png')}
            
            # Increase timeout for large file
            response = requests.post(f"{self.api_url}/photos/upload", files=files, timeout=60)
            
            if response.status_code == 200:
                data = response.json()
                self.log_result("Actual Large File Upload", True)
                print(f"   Photo ID: {data['id']}")
                
                # Clean up immediately
                cleanup_response = requests.delete(f"{self.api_url}/photos/{data['id']}")
                if cleanup_response.status_code == 200:
                    print(f"   ✅ Large file cleaned up")
                    
            else:
                self.log_result("Actual Large File Upload", False, 
                               f"Status {response.status_code}: {response.text[:200]}")
                
        except Exception as e:
            self.log_result("Actual Large File Upload", False, str(e))

    def test_invalid_file_format(self):
        """Test with invalid file format"""
        print("\n🔍 Edge Case 2: Invalid File Format")
        try:
            # Create a text file disguised as image
            text_content = b"This is not an image file"
            files = {'file': ('fake_image.txt', io.BytesIO(text_content), 'text/plain')}
            
            response = requests.post(f"{self.api_url}/photos/upload", files=files)
            
            # Should fail with 4xx or 5xx status
            if response.status_code >= 400:
                self.log_result("Invalid File Format", True, f"Correctly rejected with status {response.status_code}")
            else:
                self.log_result("Invalid File Format", False, 
                               f"Should have rejected invalid file, got status {response.status_code}")
                
        except Exception as e:
            self.log_result("Invalid File Format", False, str(e))

    def test_empty_file_upload(self):
        """Test with empty file"""
        print("\n🔍 Edge Case 3: Empty File Upload")
        try:
            empty_file = io.BytesIO(b"")
            files = {'file': ('empty.png', empty_file, 'image/png')}
            
            response = requests.post(f"{self.api_url}/photos/upload", files=files)
            
            # Should fail with 4xx or 5xx status
            if response.status_code >= 400:
                self.log_result("Empty File Upload", True, f"Correctly rejected with status {response.status_code}")
            else:
                self.log_result("Empty File Upload", False, 
                               f"Should have rejected empty file, got status {response.status_code}")
                
        except Exception as e:
            self.log_result("Empty File Upload", False, str(e))

    def test_no_file_upload(self):
        """Test upload without file"""
        print("\n🔍 Edge Case 4: No File Upload")
        try:
            response = requests.post(f"{self.api_url}/photos/upload")
            
            # Should fail with 4xx status
            if response.status_code >= 400:
                self.log_result("No File Upload", True, f"Correctly rejected with status {response.status_code}")
            else:
                self.log_result("No File Upload", False, 
                               f"Should have rejected request without file, got status {response.status_code}")
                
        except Exception as e:
            self.log_result("No File Upload", False, str(e))

    def test_malformed_photo_id_access(self):
        """Test accessing photo with malformed ID"""
        print("\n🔍 Edge Case 5: Malformed Photo ID Access")
        malformed_ids = ["", "invalid-id", "123", "null", "undefined"]
        
        success_count = 0
        for malformed_id in malformed_ids:
            try:
                response = requests.get(f"{self.api_url}/photos/{malformed_id}/file")
                
                if response.status_code == 404:
                    success_count += 1
                    print(f"   ✅ Correctly returned 404 for ID: '{malformed_id}'")
                else:
                    print(f"   ❌ ID '{malformed_id}' returned status {response.status_code}")
                    
            except Exception as e:
                print(f"   ❌ Error with ID '{malformed_id}': {e}")
        
        self.log_result("Malformed Photo ID Access", success_count == len(malformed_ids),
                       f"{success_count}/{len(malformed_ids)} malformed IDs handled correctly")

    def test_concurrent_uploads(self):
        """Test concurrent photo uploads"""
        print("\n🔍 Edge Case 6: Concurrent Photo Uploads")
        import threading
        import time
        
        results = []
        uploaded_ids = []
        
        def upload_photo(index):
            try:
                img = Image.new('RGB', (100, 100), color=['red', 'green', 'blue', 'yellow', 'purple'][index % 5])
                buffer = io.BytesIO()
                img.save(buffer, format='PNG')
                buffer.seek(0)
                
                files = {'file': (f'concurrent_{index}.png', buffer, 'image/png')}
                response = requests.post(f"{self.api_url}/photos/upload", files=files)
                
                if response.status_code == 200:
                    data = response.json()
                    results.append(True)
                    uploaded_ids.append(data['id'])
                else:
                    results.append(False)
                    
            except Exception as e:
                results.append(False)
        
        # Start 5 concurrent uploads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=upload_photo, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        success_count = sum(results)
        self.log_result("Concurrent Photo Uploads", success_count == 5,
                       f"{success_count}/5 concurrent uploads successful")
        
        # Clean up uploaded photos
        for photo_id in uploaded_ids:
            try:
                requests.delete(f"{self.api_url}/photos/{photo_id}")
            except:
                pass

    def test_api_endpoint_methods(self):
        """Test wrong HTTP methods on endpoints"""
        print("\n🔍 Edge Case 7: Wrong HTTP Methods")
        
        test_cases = [
            ("GET", "photos/upload", "Should not allow GET on upload endpoint"),
            ("PUT", "photos", "Should not allow PUT on photos list"),
            ("POST", "photos/fake-id/file", "Should not allow POST on file access"),
            ("PUT", "photos/fake-id", "Should not allow PUT on photo deletion")
        ]
        
        success_count = 0
        for method, endpoint, description in test_cases:
            try:
                if method == "GET":
                    response = requests.get(f"{self.api_url}/{endpoint}")
                elif method == "PUT":
                    response = requests.put(f"{self.api_url}/{endpoint}")
                elif method == "POST":
                    response = requests.post(f"{self.api_url}/{endpoint}")
                
                # Should return 405 Method Not Allowed or 404
                if response.status_code in [404, 405]:
                    success_count += 1
                    print(f"   ✅ {description} - Status: {response.status_code}")
                else:
                    print(f"   ❌ {description} - Unexpected status: {response.status_code}")
                    
            except Exception as e:
                print(f"   ❌ {description} - Error: {e}")
        
        self.log_result("Wrong HTTP Methods", success_count == len(test_cases),
                       f"{success_count}/{len(test_cases)} method restrictions working")

    def run_edge_case_tests(self):
        """Run all edge case tests"""
        print("🚀 Starting Edge Case Photo API Tests")
        print("=" * 50)
        
        # Edge Case 1: Actual large file
        self.test_actual_large_file()
        
        # Edge Case 2: Invalid file format
        self.test_invalid_file_format()
        
        # Edge Case 3: Empty file
        self.test_empty_file_upload()
        
        # Edge Case 4: No file
        self.test_no_file_upload()
        
        # Edge Case 5: Malformed IDs
        self.test_malformed_photo_id_access()
        
        # Edge Case 6: Concurrent uploads
        self.test_concurrent_uploads()
        
        # Edge Case 7: Wrong methods
        self.test_api_endpoint_methods()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Edge Case Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failed_test in self.failed_tests:
                print(f"   • {failed_test}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All edge case tests passed!")
            return 0
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = EdgeCasePhotoTester()
    return tester.run_edge_case_tests()

if __name__ == "__main__":
    sys.exit(main())