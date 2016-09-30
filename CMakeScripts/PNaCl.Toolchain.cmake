# How to build for PNaCl on Linux.
#
# Download the Native Client SDK.
# Run naclsdk update pepper_XX. The pepper version must be >= 34.
# Set NACL_SDK_ROOT in your environment to nacl_sdk/pepper_XX.
#
# Check out the naclports repository.
# Set NACL_ARCH to 'pnacl' in your environment and run 'make sdl glibc-compat'
# from the naclports root.
#
# Come back to the root of vba-m and run
# cmake -DCMAKE_TOOLCHAIN_FILE=CMakeScripts/PNaCl.Toolchain.cmake CMakeLists.txt
# make
#
# This will build a non-finalized PNaCl port to ./vbam and a finalized version to
# src/pnacl/app/vbam.pexe.
#
# The src/pnacl/app folder can be loaded as an unpacked extension into Chrome
# which will run vba-m as a packaged app.

include( CMakeForceCompiler )

set( PNACL                   ON )
set( PLATFORM_PREFIX         "$ENV{NACL_SDK_ROOT}/toolchain/mac_pnacl" )
set( FINALIZED_TARGET        "${CMAKE_SOURCE_DIR}/src/pnacl/app/vbam.pexe" )

set( CMAKE_SYSTEM_NAME       "Linux" CACHE STRING "Target system." )
set( CMAKE_SYSTEM_PROCESSOR  "LLVM-IR" CACHE STRING "Target processor." )
set( CMAKE_FIND_ROOT_PATH    "${PLATFORM_PREFIX}/le32-nacl/usr" )
set( CMAKE_AR                "${PLATFORM_PREFIX}/bin/pnacl-ar" CACHE STRING "")
set( CMAKE_RANLIB            "${PLATFORM_PREFIX}/bin/pnacl-ranlib" CACHE STRING "")
set( CMAKE_C_COMPILER        "${PLATFORM_PREFIX}/bin/pnacl-clang" )
set( CMAKE_CXX_COMPILER      "${PLATFORM_PREFIX}/bin/pnacl-clang++" )
set( CMAKE_C_FLAGS           "-Wno-non-literal-null-conversion -Wno-deprecated-writable-strings -U__STRICT_ANSI__" CACHE STRING "" )
set( CMAKE_CXX_FLAGS         "-Wno-non-literal-null-conversion -Wno-deprecated-writable-strings -U__STRICT_ANSI__" CACHE STRING "" )

cmake_force_c_compiler(      ${CMAKE_C_COMPILER} Clang )
cmake_force_cxx_compiler(    ${CMAKE_CXX_COMPILER} Clang )

set( CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER )
set( CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY )
set( CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY )
set( CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY )

macro( build_to_app _target )
    add_custom_command( TARGET ${_target}
        POST_BUILD
        COMMAND "${PLATFORM_PREFIX}/bin/pnacl-finalize"
        "-o" "${FINALIZED_TARGET}"
        "$<TARGET_FILE:${_target}>" )
endmacro()

set( ENV{SDLDIR} "${PLATFORM_PREFIX}/usr" )
include_directories( SYSTEM $ENV{NACL_SDK_ROOT}/include )
include_directories( SYSTEM ${PLATFORM_PREFIX}/usr/include/glibc-compat )
link_directories( $ENV{NACL_SDK_ROOT}/lib/pnacl/Release )
