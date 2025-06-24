const NoRouteMatch = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="text-center mb-4">
        The page you are looking for does not exist. 
      </div>
      {/* <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS6BZcCt8QU9ebNjhWKaNIDyDx2X-pA5iSQPg&s" alt="404" className="w-1/2" /> */}
      {/* add a button here which takes you to home page */}
      <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-4" onClick={() => {
        window.location.href = "/"
      }}>Home</button>
    </div>
  );
};

export default NoRouteMatch;
