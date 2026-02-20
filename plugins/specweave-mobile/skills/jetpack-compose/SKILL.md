---
description: Jetpack Compose and Kotlin expert for Android native development. Covers composable UI, Material Design 3, state management, Navigation, Hilt DI, Room database, coroutines/Flow, performance optimization, Gradle configuration, testing, and architecture patterns. Use for Android Compose projects.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
context: fork
---

# Jetpack Compose Expert - Android Native Development

Comprehensive Jetpack Compose expertise for building modern Android applications with Kotlin. Covers the latest stable Compose BOM, Material Design 3, and recommended architecture patterns.

## Project Setup

### Recommended Project Structure

```
app/
├── build.gradle.kts
├── src/
│   ├── main/
│   │   ├── java/com/example/myapp/
│   │   │   ├── MyApplication.kt
│   │   │   ├── MainActivity.kt
│   │   │   ├── navigation/
│   │   │   │   ├── AppNavGraph.kt
│   │   │   │   └── Routes.kt
│   │   │   ├── ui/
│   │   │   │   ├── theme/
│   │   │   │   │   ├── Theme.kt
│   │   │   │   │   ├── Color.kt
│   │   │   │   │   └── Type.kt
│   │   │   │   ├── components/
│   │   │   │   └── screens/
│   │   │   │       ├── home/
│   │   │   │       │   ├── HomeScreen.kt
│   │   │   │       │   └── HomeViewModel.kt
│   │   │   │       └── detail/
│   │   │   ├── data/
│   │   │   │   ├── local/
│   │   │   │   │   ├── dao/
│   │   │   │   │   ├── entity/
│   │   │   │   │   └── AppDatabase.kt
│   │   │   │   ├── remote/
│   │   │   │   │   ├── api/
│   │   │   │   │   └── dto/
│   │   │   │   └── repository/
│   │   │   ├── domain/
│   │   │   │   ├── model/
│   │   │   │   ├── repository/
│   │   │   │   └── usecase/
│   │   │   └── di/
│   │   │       ├── AppModule.kt
│   │   │       ├── DatabaseModule.kt
│   │   │       └── NetworkModule.kt
│   │   ├── res/
│   │   └── AndroidManifest.xml
│   ├── test/                          # Unit tests
│   └── androidTest/                   # Instrumentation tests
├── gradle/
│   └── libs.versions.toml             # Version catalog
└── settings.gradle.kts
```

### Version Catalog (libs.versions.toml)

```toml
[versions]
agp = "8.7.3"
kotlin = "2.1.0"
compose-bom = "2025.01.01"
compose-compiler = "2.1.0"  # Matches Kotlin version since K2
lifecycle = "2.8.7"
navigation = "2.8.5"
hilt = "2.53.1"
hilt-navigation-compose = "1.2.0"
room = "2.6.1"
retrofit = "2.11.0"
kotlinx-serialization = "1.7.3"
coroutines = "1.9.0"

[libraries]
compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "compose-bom" }
compose-ui = { group = "androidx.compose.ui", name = "ui" }
compose-ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
compose-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
compose-material3 = { group = "androidx.compose.material3", name = "material3" }
compose-ui-test-junit4 = { group = "androidx.compose.ui", name = "ui-test-junit4" }
compose-ui-test-manifest = { group = "androidx.compose.ui", name = "ui-test-manifest" }
lifecycle-runtime-compose = { group = "androidx.lifecycle", name = "lifecycle-runtime-compose", version.ref = "lifecycle" }
lifecycle-viewmodel-compose = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-compose", version.ref = "lifecycle" }
navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigation" }
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-android-compiler", version.ref = "hilt" }
hilt-navigation-compose = { group = "androidx.hilt", name = "hilt-navigation-compose", version.ref = "hilt-navigation-compose" }
room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
room-compiler = { group = "androidx.room", name = "room-compiler", version.ref = "room" }
room-ktx = { group = "androidx.room", name = "room-ktx", version.ref = "room" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
ksp = { id = "com.google.devtools.ksp", version = "2.1.0-1.0.29" }
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
```

### build.gradle.kts (app)

```kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.example.myapp"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.myapp"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "com.example.myapp.HiltTestRunner"
    }

    buildTypes {
        debug {
            isDebuggable = true
            applicationIdSuffix = ".debug"
            buildConfigField("String", "API_BASE_URL", "\"https://api-staging.example.com\"")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            buildConfigField("String", "API_BASE_URL", "\"https://api.example.com\"")
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.navigation.compose)
    implementation(libs.hilt.android)
    implementation(libs.hilt.navigation.compose)
    ksp(libs.hilt.compiler)
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)

    debugImplementation(libs.compose.ui.tooling)
    debugImplementation(libs.compose.ui.test.manifest)
    androidTestImplementation(platform(libs.compose.bom))
    androidTestImplementation(libs.compose.ui.test.junit4)
}
```

## Compose UI Fundamentals

### Composables and Modifiers

```kotlin
@Composable
fun ProfileCard(
    user: User,
    onFollowClick: () -> Unit,
    modifier: Modifier = Modifier  // Always accept modifier parameter
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                AsyncImage(
                    model = user.avatarUrl,
                    contentDescription = "Profile photo of ${user.name}",
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = user.name,
                        style = MaterialTheme.typography.titleMedium
                    )
                    Text(
                        text = user.bio,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = onFollowClick,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Follow")
            }
        }
    }
}
```

### Custom Layout

```kotlin
@Composable
fun FlowRow(
    modifier: Modifier = Modifier,
    horizontalSpacing: Dp = 8.dp,
    verticalSpacing: Dp = 8.dp,
    content: @Composable () -> Unit
) {
    Layout(
        content = content,
        modifier = modifier
    ) { measurables, constraints ->
        val rows = mutableListOf<List<Placeable>>()
        var currentRow = mutableListOf<Placeable>()
        var currentRowWidth = 0

        measurables.forEach { measurable ->
            val placeable = measurable.measure(constraints.copy(minWidth = 0))
            if (currentRowWidth + placeable.width > constraints.maxWidth && currentRow.isNotEmpty()) {
                rows.add(currentRow)
                currentRow = mutableListOf()
                currentRowWidth = 0
            }
            currentRow.add(placeable)
            currentRowWidth += placeable.width + horizontalSpacing.roundToPx()
        }
        if (currentRow.isNotEmpty()) rows.add(currentRow)

        val height = rows.sumOf { row -> row.maxOf { it.height } } +
            (rows.size - 1) * verticalSpacing.roundToPx()

        layout(constraints.maxWidth, height) {
            var yOffset = 0
            rows.forEach { row ->
                var xOffset = 0
                row.forEach { placeable ->
                    placeable.placeRelative(xOffset, yOffset)
                    xOffset += placeable.width + horizontalSpacing.roundToPx()
                }
                yOffset += row.maxOf { it.height } + verticalSpacing.roundToPx()
            }
        }
    }
}
```

## Material Design 3 Theming

```kotlin
// Color.kt
val LightColorScheme = lightColorScheme(
    primary = Color(0xFF006D3B),
    onPrimary = Color.White,
    primaryContainer = Color(0xFF9AF6B5),
    secondary = Color(0xFF4F6353),
    surface = Color(0xFFFBFDF8),
    error = Color(0xFFBA1A1A),
)

val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF7EDA9B),
    onPrimary = Color(0xFF00391B),
    primaryContainer = Color(0xFF00522B),
    secondary = Color(0xFFB7CCB9),
    surface = Color(0xFF191C19),
    error = Color(0xFFFFB4AB),
)

// Theme.kt
@Composable
fun MyAppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,  // Material You on Android 12+
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context)
            else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = AppTypography,
        content = content
    )
}
```

## State Management

### State in Composables

```kotlin
@Composable
fun SearchBar(onSearch: (String) -> Unit) {
    // remember: survives recomposition
    var query by remember { mutableStateOf("") }

    // rememberSaveable: survives configuration changes (rotation)
    var isExpanded by rememberSaveable { mutableStateOf(false) }

    OutlinedTextField(
        value = query,
        onValueChange = { query = it },
        modifier = Modifier.fillMaxWidth(),
        placeholder = { Text("Search...") },
        trailingIcon = {
            IconButton(onClick = { onSearch(query) }) {
                Icon(Icons.Default.Search, contentDescription = "Search")
            }
        },
        singleLine = true
    )
}
```

### ViewModel with StateFlow

```kotlin
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val productRepository: ProductRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadProducts()
    }

    fun loadProducts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            productRepository.getProducts()
                .catch { error ->
                    _uiState.update { it.copy(isLoading = false, error = error.message) }
                }
                .collect { products ->
                    _uiState.update { it.copy(isLoading = false, products = products) }
                }
        }
    }

    fun onSearchQueryChanged(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }
}

data class HomeUiState(
    val products: List<Product> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val searchQuery: String = ""
)

// Consuming in Compose
@Composable
fun HomeScreen(viewModel: HomeViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    when {
        uiState.isLoading -> LoadingIndicator()
        uiState.error != null -> ErrorMessage(uiState.error!!)
        else -> ProductList(uiState.products)
    }
}
```

## Navigation

### Type-Safe Routes (Navigation 2.8+)

```kotlin
// Routes.kt
@Serializable
data object Home

@Serializable
data class ProductDetail(val productId: String)

@Serializable
data object Cart

@Serializable
data class OrderConfirmation(val orderId: String)

// AppNavGraph.kt
@Composable
fun AppNavGraph(navController: NavHostController = rememberNavController()) {
    NavHost(navController = navController, startDestination = Home) {
        composable<Home> {
            HomeScreen(
                onProductClick = { productId ->
                    navController.navigate(ProductDetail(productId))
                },
                onCartClick = { navController.navigate(Cart) }
            )
        }

        composable<ProductDetail> { backStackEntry ->
            val route = backStackEntry.toRoute<ProductDetail>()
            ProductDetailScreen(
                productId = route.productId,
                onBack = { navController.popBackStack() }
            )
        }

        composable<Cart> {
            CartScreen(
                onCheckoutComplete = { orderId ->
                    navController.navigate(OrderConfirmation(orderId)) {
                        popUpTo(Home) { inclusive = false }
                    }
                }
            )
        }
    }
}
```

## Hilt Dependency Injection

### Module Setup

```kotlin
// AppModule.kt
@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor())
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) Level.BODY else Level.NONE
            })
            .connectTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(Json.asConverterFactory("application/json".toMediaType()))
            .build()
    }

    @Provides
    @Singleton
    fun provideProductApi(retrofit: Retrofit): ProductApi {
        return retrofit.create(ProductApi::class.java)
    }
}

// DatabaseModule.kt
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(context, AppDatabase::class.java, "app.db")
            .addMigrations(MIGRATION_1_2)
            .build()
    }

    @Provides
    fun provideProductDao(db: AppDatabase): ProductDao = db.productDao()
}
```

## Room Database with Compose

```kotlin
@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val name: String,
    val price: Double,
    val imageUrl: String?,
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis()
)

@Dao
interface ProductDao {
    @Query("SELECT * FROM products ORDER BY created_at DESC")
    fun getAll(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE name LIKE '%' || :query || '%'")
    fun search(query: String): Flow<List<ProductEntity>>

    @Upsert
    suspend fun upsertAll(products: List<ProductEntity>)

    @Delete
    suspend fun delete(product: ProductEntity)
}

@Database(entities = [ProductEntity::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
}
```

## Coroutines and Flow in Compose

```kotlin
// Collecting Flow with lifecycle awareness
@Composable
fun NotificationBadge(viewModel: NotificationViewModel = hiltViewModel()) {
    val count by viewModel.unreadCount.collectAsStateWithLifecycle()

    if (count > 0) {
        Badge { Text("$count") }
    }
}

// Side effects
@Composable
fun EventScreen(viewModel: EventViewModel = hiltViewModel()) {
    val context = LocalContext.current

    // One-time event handling
    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                is UiEvent.ShowSnackbar -> { /* show snackbar */ }
                is UiEvent.NavigateBack -> { /* navigate */ }
                is UiEvent.ShowToast -> {
                    Toast.makeText(context, event.message, Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}
```

## Performance Optimization

### Stability and Recomposition

```kotlin
// STABLE: data class with only stable properties -> Compose can skip recomposition
data class UserState(
    val name: String,
    val email: String,
    val avatarUrl: String
)

// UNSTABLE: contains List (mutable by default from Compose compiler's perspective)
// Fix with @Immutable or @Stable annotation
@Immutable
data class ProductListState(
    val items: List<Product>,  // Now treated as immutable
    val isLoading: Boolean
)

// Use key() for correct identity in lazy layouts
LazyColumn {
    items(products, key = { it.id }) { product ->
        ProductRow(product)
    }
}

// Use derivedStateOf to avoid unnecessary recompositions
@Composable
fun FilteredList(items: List<Item>, query: String) {
    val filteredItems by remember(items, query) {
        derivedStateOf {
            if (query.isBlank()) items
            else items.filter { it.name.contains(query, ignoreCase = true) }
        }
    }

    LazyColumn {
        items(filteredItems, key = { it.id }) { item ->
            ItemRow(item)
        }
    }
}
```

### Lazy Layout Best Practices

```kotlin
@Composable
fun OptimizedProductGrid(products: List<Product>) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 160.dp),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(
            items = products,
            key = { it.id },
            contentType = { "product" }  // Helps Compose reuse compositions
        ) { product ->
            ProductCard(product = product)
        }
    }
}
```

## Testing

### Compose UI Tests

```kotlin
@HiltAndroidTest
class HomeScreenTest {

    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Before
    fun setup() {
        hiltRule.inject()
    }

    @Test
    fun productList_displaysItems() {
        composeRule.setContent {
            MyAppTheme {
                HomeScreen()
            }
        }

        composeRule.onNodeWithText("Featured Products").assertIsDisplayed()
        composeRule.onAllNodesWithTag("product_card").assertCountEquals(3)
    }

    @Test
    fun searchBar_filtersProducts() {
        composeRule.setContent {
            MyAppTheme { HomeScreen() }
        }

        composeRule.onNodeWithTag("search_field")
            .performTextInput("Laptop")

        composeRule.waitUntil(timeoutMillis = 5000) {
            composeRule.onAllNodesWithTag("product_card")
                .fetchSemanticsNodes().size == 1
        }

        composeRule.onNodeWithText("Gaming Laptop").assertIsDisplayed()
    }
}
```

### ViewModel Unit Tests

```kotlin
class HomeViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var viewModel: HomeViewModel
    private lateinit var fakeRepository: FakeProductRepository

    @Before
    fun setup() {
        fakeRepository = FakeProductRepository()
        viewModel = HomeViewModel(fakeRepository)
    }

    @Test
    fun `initial load populates products`() = runTest {
        fakeRepository.emit(listOf(Product("1", "Test Product", 9.99)))

        val state = viewModel.uiState.first { it.products.isNotEmpty() }
        assertEquals(1, state.products.size)
        assertEquals("Test Product", state.products[0].name)
    }

    @Test
    fun `error state set on repository failure`() = runTest {
        fakeRepository.emitError(IOException("Network error"))

        val state = viewModel.uiState.first { it.error != null }
        assertEquals("Network error", state.error)
        assertFalse(state.isLoading)
    }
}

// MainDispatcherRule for coroutine tests
class MainDispatcherRule(
    private val dispatcher: TestDispatcher = UnconfinedTestDispatcher()
) : TestWatcher() {
    override fun starting(description: Description) {
        Dispatchers.setMain(dispatcher)
    }
    override fun finished(description: Description) {
        Dispatchers.resetMain()
    }
}
```

## Architecture Decision Framework

### MVVM (Default, Google-recommended)

```
Choose MVVM when:
- Following Android official guidelines
- Team is familiar with ViewModel + StateFlow
- App has straightforward screens with CRUD operations
- You want broad community support and documentation
```

### MVI (Model-View-Intent)

```
Choose MVI when:
- Complex user interactions and state transitions
- Need strict unidirectional data flow
- Debugging requires action replay / time-travel
- State must be highly predictable
```

### Clean Architecture Layers

```
Choose Clean Architecture layering when:
- Large team with multiple developers
- Features must be independently testable
- Business logic must survive UI/framework changes
- You need clear module boundaries

Layers:
  presentation/ -> ViewModel, UI State, Compose screens
  domain/       -> Use cases, domain models, repository interfaces
  data/         -> Repository implementations, data sources, mappers
```

## ProGuard / R8 Configuration

```proguard
# proguard-rules.pro

# Keep Compose
-dontwarn androidx.compose.**
-keep class androidx.compose.** { *; }

# Keep Kotlin serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers @kotlinx.serialization.Serializable class ** {
    *** Companion;
    kotlinx.serialization.KSerializer serializer(...);
}

# Keep Hilt
-keep,allowobfuscation,allowoptimization class * extends dagger.hilt.android.internal.managers.ViewComponentManager$FragmentContextWrapper { *; }

# Keep Room entities
-keep class com.example.myapp.data.local.entity.** { *; }

# Keep Retrofit service interfaces
-keep,allowobfuscation interface com.example.myapp.data.remote.api.** { *; }
```

## Accessibility in Compose

```kotlin
@Composable
fun AccessibleProductCard(product: Product, onAddToCart: () -> Unit) {
    Card(
        modifier = Modifier
            .semantics(mergeDescendants = true) { }
            .fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            AsyncImage(
                model = product.imageUrl,
                contentDescription = null,  // Decorative, described by text below
                modifier = Modifier.height(200.dp)
            )
            Text(
                text = product.name,
                style = MaterialTheme.typography.titleMedium
            )
            Text(
                text = "$${product.price}",
                style = MaterialTheme.typography.bodyLarge
            )
            Button(
                onClick = onAddToCart,
                modifier = Modifier.semantics {
                    contentDescription = "Add ${product.name} to cart, price $${product.price}"
                }
            ) {
                Icon(Icons.Default.Add, contentDescription = null)
                Text("Add to Cart")
            }
        }
    }
}

// Custom actions for TalkBack
@Composable
fun SwipeableListItem(item: Item, onDelete: () -> Unit, onArchive: () -> Unit) {
    ListItem(
        headlineContent = { Text(item.title) },
        modifier = Modifier.semantics {
            customActions = listOf(
                CustomAccessibilityAction("Delete") { onDelete(); true },
                CustomAccessibilityAction("Archive") { onArchive(); true }
            )
        }
    )
}
```

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Collecting Flow without lifecycle | Use `collectAsStateWithLifecycle()`, not `collectAsState()` |
| Side effects in composition | Use `LaunchedEffect`, `SideEffect`, `DisposableEffect` |
| ViewModel in nested composable | Only call `hiltViewModel()` at screen-level composables |
| Unstable lambda parameters | Use `remember { { onClick() } }` or extract to function reference |
| Missing keys in LazyColumn | Always provide `key` parameter to `items()` |
| Large recomposition scope | Extract composables, use `derivedStateOf`, mark classes `@Stable` |
| Blocking main thread in ViewModel | Use `viewModelScope.launch` with appropriate dispatcher |
| Hardcoded strings in UI | Use `stringResource(R.string.x)` for localization support |

## Related Skills

- `appstore` - **Recommended**: App Store Connect automation via `asc` CLI (for iOS counterpart of your Android app)
- `flutter` - Cross-platform alternative with Dart
- `mobile-testing` - Comprehensive testing strategies (Espresso, Compose testing)
- `deep-linking-push` - Deep linking (App Links) and push notifications (FCM)
