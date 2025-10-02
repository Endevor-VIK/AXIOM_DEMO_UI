cmake_minimum_required(VERSION 3.21)
project(netwatch LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ВАЖНО: зафиксируем версию SDK, чтобы VS взял её
set(CMAKE_SYSTEM_VERSION 10.0.19041.0)

add_executable(netwatch scripts/netwatch.cpp)

# макросы как при сборке cl
target_compile_definitions(netwatch PRIVATE WINVER=0x0A00 _WIN32_WINNT=0x0A00 NOMINMAX)

# ЯВНО добавим каталоги библиотек (MSVC+Windows SDK)
if(MSVC)
  target_link_directories(netwatch PRIVATE
    "$ENV{VCToolsInstallDir}/lib/x64"
    "$ENV{WindowsSdkDir}/Lib/$ENV{WindowsSDKLibVersion}/um/x64"
  )
endif()

# WinAPI-библиотеки (убрали Icmp)
target_link_libraries(netwatch PRIVATE winhttp iphlpapi ws2_32)

# Аргументы и рабочая папка для отладки
if(MSVC)
  set_property(TARGET netwatch PROPERTY VS_DEBUGGER_WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}")
  set_target_properties(netwatch PROPERTIES VS_DEBUGGER_COMMAND_ARGUMENTS "2000")
endif()
